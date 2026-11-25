const waitlistModel = require('../models/waitlistModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const appointmentModel = require('../models/appointmentModel');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');
const { parseDay, toSqlDateTime } = require('../utils/scheduling');

// Parses the doctor id and day from the URL, throwing 400 if either is invalid.
function parseParams(params) {
  const doctorId = parseId(params.id, 'doctor id');
  const day = parseDay(params.date);
  if (!day) throw new AppError(400, 'date must be a valid calendar date in the form YYYY-MM-DD');
  return { doctorId, day };
}

// Throws 404 if the doctor does not exist.
async function assertDoctorExists(doctorId) {
  if (!(await doctorModel.findById(doctorId))) throw new AppError(404, 'Doctor not found');
}

// Adds a patient to a doctor's waitlist for a day and returns their position.
async function join(req, res) {
  const { doctorId, day } = parseParams(req.params);
  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  const unknown = Object.keys(body).filter((k) => k !== 'patient_id');
  if (unknown.length) throw new AppError(400, 'Validation failed', [`Unknown field(s): ${unknown.join(', ')}`]);
  const patientId = parseId(body.patient_id, 'patient_id');

  if (day < toSqlDateTime(new Date()).slice(0, 10)) {
    throw new AppError(422, 'You can only join the waitlist for today or a future day');
  }
  await assertDoctorExists(doctorId);
  if (!(await patientModel.findById(patientId))) throw new AppError(404, 'Patient not found');
  if (await appointmentModel.patientHasAppointmentWithDoctorOnDay(patientId, doctorId, day)) {
    throw new AppError(409, 'Patient already has an appointment with this doctor that day');
  }

  const position = await waitlistModel.join(doctorId, day, patientId);
  if (position === null) throw new AppError(409, 'Patient is already on this waitlist');
  res.status(201).json({ doctor_id: doctorId, date: day, patient_id: patientId, position });
}

// Lists the patients on a doctor's waitlist for a day, in order.
async function list(req, res) {
  const { doctorId, day } = parseParams(req.params);
  await assertDoctorExists(doctorId);
  const ids = await waitlistModel.list(doctorId, day);
  res.json({
    doctor_id: doctorId,
    date: day,
    waiting: ids.map((patientId, i) => ({ position: i + 1, patient_id: patientId })),
  });
}

// Removes a patient from a doctor's waitlist for a day.
async function leave(req, res) {
  const { doctorId, day } = parseParams(req.params);
  const patientId = parseId(req.params.patientId, 'patient id');
  if (!(await waitlistModel.remove(doctorId, day, patientId))) {
    throw new AppError(404, 'Patient is not on this waitlist');
  }
  res.status(204).end();
}

module.exports = { join, list, leave };
