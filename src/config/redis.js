const { createClient } = require('redis');

const STARTUP_ATTEMPTS = 3;

let connectedOnce = false;

// Gives up after a few tries on first start, but keeps reconnecting once a connection has worked.
function reconnectStrategy(retries) {
  if (!connectedOnce && retries >= STARTUP_ATTEMPTS) return new Error('Could not connect to Redis');
  return Math.min(500 * (retries + 1), 5000);
}

// Creates the shared Redis client; commands fail fast instead of queueing while disconnected.
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  disableOfflineQueue: true,
  socket: { reconnectStrategy },
});

redis.on('ready', () => {
  connectedOnce = true;
});
redis.on('error', (err) => console.error(`Redis error: ${err.message}`));

module.exports = redis;
