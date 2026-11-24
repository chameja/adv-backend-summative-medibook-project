require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

// Checks the MySQL connection, then starts the HTTP server.
async function start() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error(`Cannot connect to MySQL: ${err.message}`);
    console.error('Check your .env and that database/schema.sql has been run.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`MediBook API listening on http://localhost:${PORT}`);
  });
}

start();
