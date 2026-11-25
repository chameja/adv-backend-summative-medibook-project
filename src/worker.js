require('dotenv').config();

const redis = require('./config/redis');
const pool = require('./config/db');
const { checkConnection } = require('./models/healthModel');
const handlers = require('./queues/jobHandlers');
const { KEYS } = require('./queues/jobQueue');
const { logAudit } = require('./utils/auditLogger');

const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 5;

let running = true;

// Waits for the given number of milliseconds.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Moves jobs a crashed worker left in the processing list back to the front of the queue.
async function recoverUnfinishedJobs() {
  let recovered = 0;
  while (await redis.lMove(KEYS.processing, KEYS.jobs, 'RIGHT', 'LEFT')) recovered += 1;
  if (recovered) console.log(`Recovered ${recovered} unfinished job(s)`);
}

// Moves a job that cannot succeed to the failed list and logs it.
async function deadLetter(raw, job, error) {
  const entry = JSON.stringify({ ...job, raw: job ? undefined : raw, error, failed_at: new Date().toISOString() });
  await redis.multi().lRem(KEYS.processing, 1, raw).rPush(KEYS.failed, entry).exec();
  await logAudit('JOB_FAILED', { job_id: job?.id, job_type: job?.type, attempts: job?.attempts, error });
}

// Runs one job; on failure retries it with backoff, or dead-letters it after MAX_ATTEMPTS.
async function processJob(raw) {
  let job;
  try {
    job = JSON.parse(raw);
  } catch {
    await deadLetter(raw, null, 'Job is not valid JSON');
    return;
  }
  const handler = handlers[job.type];
  if (!handler) {
    await deadLetter(raw, job, `Unknown job type: ${job.type}`);
    return;
  }

  try {
    await handler(job.payload);
    await redis.lRem(KEYS.processing, 1, raw);
  } catch (err) {
    const retry = { ...job, attempts: job.attempts + 1, last_error: err.message };
    console.error(`Job ${job.type} ${job.id} failed (attempt ${retry.attempts}): ${err.message}`);
    if (retry.attempts >= MAX_ATTEMPTS) {
      await deadLetter(raw, retry, err.message);
      return;
    }
    await sleep(1000 * retry.attempts);
    await redis.multi().lRem(KEYS.processing, 1, raw).rPush(KEYS.jobs, JSON.stringify(retry)).exec();
  }
}

// Connects to Redis and MySQL, then takes jobs from the queue until asked to stop.
async function main() {
  await redis.connect();
  await checkConnection();
  const blocking = redis.duplicate();
  blocking.on('error', (err) => console.error(`Redis error (blocking client): ${err.message}`));
  await blocking.connect();

  await recoverUnfinishedJobs();
  console.log('MediBook worker waiting for jobs');

  while (running) {
    try {
      const raw = await blocking.blMove(KEYS.jobs, KEYS.processing, 'LEFT', 'RIGHT', BLOCK_SECONDS);
      if (raw) await processJob(raw);
    } catch (err) {
      console.error(`Worker loop error: ${err.message}`);
      await sleep(1000);
    }
  }

  blocking.destroy();
  redis.destroy();
  await pool.end();
  console.log('MediBook worker stopped');
}

// Asks the worker loop to finish its current job and stop.
function stop() {
  running = false;
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

main().catch((err) => {
  console.error(`Worker failed to start: ${err.message}`);
  console.error('Check your .env, that MySQL is set up and that Redis is running.');
  process.exit(1);
});
