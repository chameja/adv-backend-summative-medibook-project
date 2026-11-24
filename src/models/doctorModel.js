const pool = require('../config/db');

const COLUMNS = 'doctor_id, full_name, specialty, consultation_fee, room';

// Returns all doctors.
async function findAll() {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM doctors ORDER BY doctor_id`);
  return rows;
}

// Returns one doctor by id, or null.
async function findById(id, conn = pool) {
  const [rows] = await conn.execute(`SELECT ${COLUMNS} FROM doctors WHERE doctor_id = ?`, [id]);
  return rows[0] || null;
}

// Returns one doctor by id and locks the row until the transaction ends.
async function lockById(conn, id) {
  const [rows] = await conn.execute(
    `SELECT ${COLUMNS} FROM doctors WHERE doctor_id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

// Inserts a doctor and returns the new row.
async function create({ full_name, specialty, consultation_fee, room }) {
  const [result] = await pool.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [full_name, specialty, consultation_fee, room]
  );
  return findById(result.insertId);
}

const UPDATABLE = ['full_name', 'specialty', 'consultation_fee', 'room'];

// Updates the given doctor fields and returns the updated row, or null.
async function update(id, fields) {
  const columns = UPDATABLE.filter((c) => fields[c] !== undefined);
  if (columns.length === 0) return findById(id);
  const setClause = columns.map((c) => `${c} = ?`).join(', ');
  const [result] = await pool.execute(
    `UPDATE doctors SET ${setClause} WHERE doctor_id = ?`,
    [...columns.map((c) => fields[c]), id]
  );
  return result.affectedRows === 0 ? null : findById(id);
}

// Deletes a doctor and returns whether a row was deleted.
async function remove(id) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE doctor_id = ?', [id]);
  return result.affectedRows > 0;
}

// Returns a doctor's revenue, upcoming count, per-day bookings and utilization for the next 7 days.
async function getStats(id, dailyCap, days = 7) {
  const [[summary]] = await pool.execute(
    `SELECT
       COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected,
       COUNT(CASE WHEN a.status = 'BOOKED' AND a.appt_datetime > NOW() THEN 1 END) AS upcoming_count
     FROM appointments a
     WHERE a.doctor_id = ?`,
    [id]
  );

  const [perDay] = await pool.execute(
    `WITH RECURSIVE calendar (day) AS (
       SELECT CURDATE()
       UNION ALL
       SELECT day + INTERVAL 1 DAY FROM calendar WHERE day < CURDATE() + INTERVAL ? DAY
     )
     SELECT
       DATE_FORMAT(c.day, '%Y-%m-%d') AS date,
       COUNT(a.appointment_id) AS appointments,
       ROUND(COUNT(a.appointment_id) / ? * 100, 2) AS utilization_pct
     FROM calendar c
     LEFT JOIN appointments a
       ON a.doctor_id = ?
      AND a.status = 'BOOKED'
      AND a.appt_datetime >= c.day
      AND a.appt_datetime < c.day + INTERVAL 1 DAY
     GROUP BY c.day
     ORDER BY c.day`,
    [days - 1, dailyCap, id]
  );

  const [[utilization]] = await pool.execute(
    `SELECT
       COUNT(*) AS booked_next_7_days,
       ROUND(COUNT(*) / (? * ?) * 100, 2) AS utilization_pct
     FROM appointments
     WHERE doctor_id = ?
       AND status = 'BOOKED'
       AND appt_datetime >= CURDATE()
       AND appt_datetime < CURDATE() + INTERVAL ? DAY`,
    [days, dailyCap, id, days]
  );

  return { summary, perDay, utilization };
}

module.exports = { findAll, findById, lockById, create, update, remove, getStats };
