const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { withTransaction } = require('../models/transaction');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');
const { logAudit } = require('../utils/auditLogger');
const {
  MAX_APPOINTMENTS_PER_DAY,
  validateSlot,
  parseDateTime,
  calculateRefund,
  toSqlDateTime,
} = require('../utils/scheduling');

const BOOKING_FIELDS = ['patient_id', 'doctor_id', 'appt_datetime'];

// Returns one appointment or 404.
async function getOne(req, res) {
  const appointment = await appointmentModel.findById(parseId(req.params.id));
  if (!appointment) throw new AppError(404, 'Appointment not found');
  res.json(appointment);
}

// Validates and books an appointment, enforcing the slot, daily-cap and double-booking rules.
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
  logAudit('APPOINTMENT_BOOKED', {
    appointment_id: appointment.appointment_id,
    appt_ref: appointment.appt_ref,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    appt_datetime: appointment.appt_datetime,
    amount_paid: appointment.amount_paid,
  });
  res.status(201).location(`/api/appointments/${appointmentId}`).json(appointment);
}

// Cancels an appointment, calculates its refund and keeps the record for history.
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

  logAudit('APPOINTMENT_CANCELLED', {
    appointment_id: id,
    appt_ref: outcome.appt.appt_ref,
    patient_id: outcome.appt.patient_id,
    doctor_id: outcome.appt.doctor_id,
    appt_datetime: outcome.appt.appt_datetime,
    amount_paid: outcome.appt.amount_paid,
    refund_percentage: outcome.refund.percentage,
    refund_amount: outcome.refund.refundAmount,
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
