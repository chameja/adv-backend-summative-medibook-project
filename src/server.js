require('dotenv').config();

const app = require('./app');
const { checkConnection } = require('./models/healthModel');
const redis = require('./config/redis');

const PORT = Number(process.env.PORT) || 3000;

// Checks the MySQL and Redis connections, then starts the HTTP server.
async function start() {
  try {
    await checkConnection();
  } catch (err) {
    console.error(`Cannot connect to MySQL: ${err.message}`);
    console.error('Check your .env and that database/schema.sql has been run.');
    process.exit(1);
  }

  try {
    await redis.connect();
  } catch (err) {
    console.error(`Cannot connect to Redis: ${err.message}`);
    console.error('Check REDIS_URL in your .env and that Redis is running.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`MediBook API listening on http://localhost:${PORT}`);
  });
}

start();
