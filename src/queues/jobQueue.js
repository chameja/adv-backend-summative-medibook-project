const crypto = require('crypto');
const redis = require('../config/redis');
const { logAudit } = require('../utils/auditLogger');

const KEYS = {
  jobs: 'medibook:jobs',
  processing: 'medibook:jobs:processing',
  failed: 'medibook:jobs:failed',
};

const JOB_TYPES = {
  SLOT_FREED: 'SLOT_FREED',
  SEND_CONFIRMATION: 'SEND_CONFIRMATION',
};

// Adds a job to the queue and returns whether it was queued; never throws.
async function enqueue(type, payload) {
  const job = { id: crypto.randomUUID(), type, payload, attempts: 0, enqueued_at: new Date().toISOString() };
  try {
    await redis.rPush(KEYS.jobs, JSON.stringify(job));
    return true;
  } catch (err) {
    console.error(`Could not enqueue ${type} job: ${err.message}`);
    logAudit('JOB_ENQUEUE_FAILED', { job_type: type, payload, error: err.message });
    return false;
  }
}

module.exports = { KEYS, JOB_TYPES, enqueue };
