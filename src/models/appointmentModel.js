const pool = require('../config/db');

const SELECT_DETAILED = `
  SELECT a.appointment_id, a.appt_ref, a.patient_id, p.full_name AS patient_name,
         a.doctor_id, d.full_name AS doctor_name, d.specialty, d.room,
         a.appt_datetime, a.amount_paid, a.booked_on, a.status,
         a.cancelled_at, a.refund_amount
  FROM appointments a
  JOIN patients p ON p.patient_id = a.patient_id
  JOIN doctors  d ON d.doctor_id  = a.doctor_id`;

// Returns one appointment with patient and doctor details, or null.
async function findById(id, conn = pool) {
  const [rows] = await conn.execute(`${SELECT_DETAILED} WHERE a.appointment_id = ?`, [id]);
  return rows[0] || null;
}

// Counts the booked appointments a doctor has on a given day.
async function countActiveForDoctorOnDay(conn, doctorId, day) {
  const [[row]] = await conn.execute(
    `SELECT COUNT(*) AS total
     FROM appointments
     WHERE doctor_id = ?
       AND status = 'BOOKED'
       AND appt_datetime >= ?
       AND appt_datetime < ? + INTERVAL 1 DAY`,
    [doctorId, day, day]
  );
  return Number(row.total);
}

// Returns whether the doctor already has a booked appointment at this time.
async function isSlotTaken(conn, doctorId, datetime) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM appointments
     WHERE doctor_id = ? AND appt_datetime = ? AND status = 'BOOKED'
     LIMIT 1`,
    [doctorId, datetime]
  );
  return rows.length > 0;
}

// Returns whether the patient already has a booked appointment at this time.
async function patientHasAppointmentAt(conn, patientId, datetime) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM appointments
     WHERE patient_id = ? AND appt_datetime = ? AND status = 'BOOKED'
     LIMIT 1`,
    [patientId, datetime]
  );
  return rows.length > 0;
}

// Inserts a booked appointment, sets its AP-xxx reference and returns its id.
async function insertBooked(conn, { patientId, doctorId, datetime, amountPaid }) {
  const tempRef = `T${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 6)}`;
  const [result] = await conn.execute(
    `INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on)
     VALUES (?, ?, ?, ?, ?, CURDATE())`,
    [tempRef, patientId, doctorId, datetime, amountPaid]
  );
  await conn.execute(
    `UPDATE appointments SET appt_ref = CONCAT('AP-', LPAD(appointment_id, 3, '0'))
     WHERE appointment_id = ?`,
    [result.insertId]
  );
  return result.insertId;
}

// Returns one appointment by id and locks the row until the transaction ends.
async function lockById(conn, id) {
  const [rows] = await conn.execute(
    `SELECT appointment_id, appt_ref, patient_id, doctor_id, appt_datetime,
            amount_paid, status
     FROM appointments WHERE appointment_id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

// Marks an appointment as cancelled and records its refund.
async function markCancelled(conn, id, refundAmount, cancelledAt) {
  const [result] = await conn.execute(
    `UPDATE appointments
     SET status = 'CANCELLED', cancelled_at = ?, refund_amount = ?
     WHERE appointment_id = ? AND status = 'BOOKED'`,
    [cancelledAt, refundAmount, id]
  );
  return result.affectedRows === 1;
}

module.exports = {
  findById,
  countActiveForDoctorOnDay,
  isSlotTaken,
  patientHasAppointmentAt,
  insertBooked,
  lockById,
  markCancelled,
};
