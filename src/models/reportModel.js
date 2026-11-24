const pool = require('../config/db');

// Returns every doctor's appointment totals and revenue, including doctors with none.
async function doctorsReport() {
  const [rows] = await pool.execute(
    `SELECT
       d.doctor_id,
       d.full_name,
       d.specialty,
       COUNT(a.appointment_id) AS total_appointments,
       COUNT(CASE WHEN a.status = 'BOOKED' THEN 1 END) AS active_appointments,
       COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) AS cancelled_appointments,
       COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0.00) AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     GROUP BY d.doctor_id, d.full_name, d.specialty
     ORDER BY revenue_collected DESC, d.doctor_id`
  );
  return rows;
}

// Returns every doctor and date where bookings exceed the given percentage of daily capacity.
async function busyDaysReport(dailyCap, thresholdPct) {
  const [rows] = await pool.execute(
    `WITH daily_load AS (
       SELECT doctor_id, DATE(appt_datetime) AS appt_date, COUNT(*) AS booked_slots
       FROM appointments
       WHERE status = 'BOOKED'
       GROUP BY doctor_id, DATE(appt_datetime)
       HAVING COUNT(*) > ? * ? / 100
     )
     SELECT
       d.doctor_id,
       d.full_name,
       d.specialty,
       DATE_FORMAT(l.appt_date, '%Y-%m-%d') AS date,
       l.booked_slots,
       ? AS daily_capacity,
       ROUND(l.booked_slots / ? * 100, 2) AS utilization_pct
     FROM daily_load l
     JOIN doctors d ON d.doctor_id = l.doctor_id
     ORDER BY l.appt_date, d.doctor_id`,
    [dailyCap, thresholdPct, dailyCap, dailyCap]
  );
  return rows;
}

module.exports = { doctorsReport, busyDaysReport };
