const mysql = require('mysql2/promise');

// Creates the shared MySQL connection pool used by the models.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'medibook',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  dateStrings: true,
  decimalNumbers: false,
  multipleStatements: false,
});

module.exports = pool;
