// Runs `work(conn)` inside a MySQL transaction on a dedicated pooled connection.
// Commits if `work` resolves, rolls back if it throws, always releases the connection.
// Controllers use this to group several model calls atomically; they only pass the
// connection handle through to model functions and never run SQL on it themselves.
const pool = require('../config/db');

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
