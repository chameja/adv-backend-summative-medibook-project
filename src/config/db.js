// MySQL connection pool (mysql2/promise).
// Only files in src/models/ should import this — controllers and routes never touch the DB.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'medibook',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  // Return DATETIME/DATE as strings ('2026-08-10 09:00:00') instead of JS Dates,
  // so values are not shifted by the server's timezone.
  dateStrings: true,
  // Keep DECIMAL columns (fees, refunds) exact — returned as strings.
  decimalNumbers: false,
  // Never allow multiple statements in one query (defence in depth against injection).
  multipleStatements: false,
});

module.exports = pool;
