const pool = require('../config/db');

const COLUMNS = 'patient_id, full_name, email, phone';

// Returns all patients.
async function findAll() {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM patients ORDER BY patient_id`);
  return rows;
}

// Returns one patient by id, or null.
async function findById(id, conn = pool) {
  const [rows] = await conn.execute(`SELECT ${COLUMNS} FROM patients WHERE patient_id = ?`, [id]);
  return rows[0] || null;
}

// Returns one patient by id and locks the row until the transaction ends.
async function lockById(conn, id) {
  const [rows] = await conn.execute(`SELECT ${COLUMNS} FROM patients WHERE patient_id = ? FOR UPDATE`, [id]);
  return rows[0] || null;
}

// Inserts a patient and returns the new row.
async function create({ full_name, email, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone]
  );
  return findById(result.insertId);
}

const UPDATABLE = ['full_name', 'email', 'phone'];

// Updates the given patient fields and returns the updated row, or null.
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

// Deletes a patient and returns whether a row was deleted.
async function remove(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE patient_id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, lockById, create, update, remove };
