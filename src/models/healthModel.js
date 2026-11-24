const pool = require('../config/db');

// Runs a trivial query to check the MySQL connection works.
async function checkConnection() {
  await pool.query('SELECT 1');
}

module.exports = { checkConnection };
