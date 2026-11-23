// All SQL for the `patients` table. Every query uses ? placeholders.
const pool = require('../config/db');

const COLUMNS = 'patient_id, full_name, email, phone';

async function findAll() {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM patients ORDER BY patient_id`);
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.execute(`SELECT ${COLUMNS} FROM patients WHERE patient_id = ?`, [id]);
  return rows[0] || null;
}

// Lock the patient row for the booking transaction (see bookingController).
async function lockById(conn, id) {
  const [rows] = await conn.execute(`SELECT ${COLUMNS} FROM patients WHERE patient_id = ? FOR UPDATE`, [id]);
  return rows[0] || null;
}

async function create({ full_name, email, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone]
  );
  return findById(result.insertId);
}

// Column names come from a fixed whitelist (never from user input); values are parameterized.
const UPDATABLE = ['full_name', 'email', 'phone'];

async function update(id, fields) {
  const columns = UPDATABLE.filter((c) => fields[c] !== undefined);
  if (columns.length === 0) return findById(id);
  const setClause = columns.map((c) => `${c} = ?`).join(', ');
  const [result] = await pool.execute(
    `UPDATE patients SET ${setClause} WHERE patient_id = ?`,
    [...columns.map((c) => fields[c]), id]
  );
  return result.affectedRows === 0 ? null : findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, lockById, create, update, remove };
