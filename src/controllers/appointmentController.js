// Booking and cancellation business logic (Part C.2 and C.3).
const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { withTransaction } = require('../models/transaction');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');
const {
  MAX_APPOINTMENTS_PER_DAY,
  validateSlot,
  parseDateTime,
  calculateRefund,
  toSqlDateTime,
} = require('../utils/scheduling');

const BOOKING_FIELDS = ['patient_id', 'doctor_id', 'appt_datetime'];

async function getOne(req, res) {
  const appointment = await appointmentModel.findById(parseId(req.params.id));
  if (!appointment) throw new AppError(404, 'Appointment not found');
  res.json(appointment);
}

/**
 * POST /api/appointments
 * 400 malformed input · 404 unknown patient/doctor · 422 time breaks a booking rule
 * 409 slot taken / doctor's day full / patient already booked at that time
 *
 * Concurrency: inside one transaction we lock the patient row, then the doctor row
 * (always in that order, so two bookings cannot deadlock each other). Every booking
 * for a doctor waits for that doctor's lock, so the "12 per day" count and the
 * "slot free" check cannot go stale before the new row is written. The UNIQUE key
 * uq_doctor_slot(doctor_id, appt_datetime, active_slot) is the database-level backstop:
 * even if application checks were bypassed, a second insert fails with ER_DUP_ENTRY
 * and the error handler turns it into a 409.
 */
async function book(req, res) {
  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  const errors = [];
  const unknown = Object.keys(body).filter((k) => !BOOKING_FIELDS.includes(k));
  if (unknown.length) errors.push(`Unknown field(s): ${unknown.join(', ')}`);

  let patientId;
  let doctorId;
  try { patientId = parseId(body.patient_id, 'patient_id'); } catch (e) { errors.push(e.message); }
  try { doctorId = parseId(body.doctor_id, 'doctor_id'); } catch (e) { errors.push(e.message); }

  const check = validateSlot(body.appt_datetime, new Date());
  if (!check.ok && check.reason === 'MALFORMED') errors.push(check.message);
  if (errors.length) throw new AppError(400, 'Validation failed', errors);
  if (!check.ok) throw new AppError(422, check.message, { reason: check.reason });

  const { slot } = check;

  const appointmentId = await withTransaction(async (conn) => {
    const patient = await patientModel.lockById(conn, patientId);
    if (!patient) throw new AppError(404, 'Patient not found');
    const doctor = await doctorModel.lockById(conn, doctorId);
    if (!doctor) throw new AppError(404, 'Doctor not found');

    if (await appointmentModel.isSlotTaken(conn, doctorId, slot.sql)) {
      throw new AppError(409, 'This doctor slot is already booked', { reason: 'SLOT_TAKEN' });
    }
    const bookedToday = await appointmentModel.countActiveForDoctorOnDay(conn, doctorId, slot.day);
    if (bookedToday >= MAX_APPOINTMENTS_PER_DAY) {
      throw new AppError(
        409,
        `Doctor already has the maximum of ${MAX_APPOINTMENTS_PER_DAY} appointments on ${slot.day}`,
        { reason: 'DOCTOR_DAY_FULL' }
      );
    }
    if (await appointmentModel.patientHasAppointmentAt(conn, patientId, slot.sql)) {
      throw new AppError(409, 'Patient already has an appointment at this time', {
        reason: 'PATIENT_DOUBLE_BOOKED',
      });
    }

    return appointmentModel.insertBooked(conn, {
      patientId,
      doctorId,
      datetime: slot.sql,
      amountPaid: doctor.consultation_fee,
    });
  });

  const appointment = await appointmentModel.findById(appointmentId);
  res.status(201).location(`/api/appointments/${appointmentId}`).json(appointment);
}

/**
 * DELETE /api/appointments/:id — cancels the appointment.
 * The row is kept (status CANCELLED + refund_amount) for refund history; only the
 * slot is released. Lock + refund calculation + status change run in one transaction, so
 * the cancellation and its refund are recorded together or not at all, and two
 * simultaneous cancel requests cannot both succeed.
 */
async function cancel(req, res) {
  const id = parseId(req.params.id);
  const now = new Date();

  const outcome = await withTransaction(async (conn) => {
    const appt = await appointmentModel.lockById(conn, id);
    if (!appt) throw new AppError(404, 'Appointment not found');
    if (appt.status === 'CANCELLED') {
      throw new AppError(409, 'Appointment is already cancelled');
    }

    const apptDate = parseDateTime(appt.appt_datetime).date;
    if (apptDate.getTime() <= now.getTime()) {
      throw new AppError(422, 'Appointments that have already started or passed cannot be cancelled');
    }

    const refund = calculateRefund(appt.amount_paid, apptDate, now);
    await appointmentModel.markCancelled(conn, id, refund.refundAmount, toSqlDateTime(now));
    return { appt, refund };
  });

  res.json({
    message: 'Appointment cancelled',
    appointment_id: id,
    appt_ref: outcome.appt.appt_ref,
    appt_datetime: outcome.appt.appt_datetime,
    amount_paid: outcome.appt.amount_paid,
    hours_notice: Math.floor(outcome.refund.hoursNotice * 100) / 100,
    refund_percentage: outcome.refund.percentage,
    refund_amount: outcome.refund.refundAmount,
  });
}

module.exports = { getOne, book, cancel };
