const fs = require('fs/promises');
const path = require('path');

const DEFAULT_LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'audit.log');

let writeChain = Promise.resolve();

// Returns the audit log file path, configurable with AUDIT_LOG_FILE.
function logFilePath() {
  return process.env.AUDIT_LOG_FILE || DEFAULT_LOG_FILE;
}

// Appends one line to the log file, creating the logs directory if it does not exist.
async function appendLine(file, line) {
  try {
    await fs.appendFile(file, line, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, line, 'utf8');
  }
}

// Queues an audit event as a JSON line and resolves to whether it was written; never throws.
function logAudit(event, data = {}) {
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...data })}\n`;
  const file = logFilePath();
  writeChain = writeChain.then(
    () => appendLine(file, line).then(
      () => true,
      (err) => {
        console.error(`Audit log write failed (${event}): ${err.message}`);
        return false;
      }
    )
  );
  return writeChain;
}

module.exports = { logAudit };
