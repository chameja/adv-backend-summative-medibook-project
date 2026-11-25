const appointmentModel = require('../models/appointmentModel');
const waitlistModel = require('../models/waitlistModel');
const { bookSlot } = require('../controllers/appointmentController');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/auditLogger');
const { validateSlot } = require('../utils/scheduling');
const { JOB_TYPES } = require('./jobQueue');

// Writes the confirmation message for a booked appointment to the audit log.
async function sendConfirmation({ appointment_id: appointmentId }) {
  const appt = await appointmentModel.findById(appointmentId);
  if (!appt || appt.status !== 'BOOKED') {
    await logAudit('NOTIFICATION_SKIPPED', { appointment_id: appointmentId, reason: 'appointment no longer booked' });
    return;
  }
  const written = await logAudit('NOTIFICATION_SENT', {
    channel: 'SMS/EMAIL',
    appointment_id: appt.appointment_id,
    appt_ref: appt.appt_ref,
    patient_id: appt.patient_id,
    message:
      `Your appointment ${appt.appt_ref} with ${appt.doctor_name} (${appt.specialty}, room ${appt.room}) ` +
      `on ${appt.appt_datetime.slice(0, 16)} is confirmed.`,
  });
  if (!written) throw new Error('Could not write the confirmation to the audit log');
}

// Books the first suitable waitlisted patient into a freed slot, removing them only once booked.
async function promoteFromWaitlist({ doctor_id: doctorId, appt_datetime: apptDatetime }) {
  const check = validateSlot(apptDatetime, new Date());
  if (!check.ok) {
    await logAudit('WAITLIST_SLOT_EXPIRED', { doctor_id: doctorId, appt_datetime: apptDatetime });
    return;
  }
  const { slot } = check;

  for (const patientId of await waitlistModel.list(doctorId, slot.day)) {
    try {
      const appointment = await bookSlot({ patientId, doctorId, slot, source: 'WAITLIST' });
      await waitlistModel.remove(doctorId, slot.day, patientId);
      await logAudit('WAITLIST_PROMOTED', {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointment.appointment_id,
        appt_ref: appointment.appt_ref,
        appt_datetime: appointment.appt_datetime,
      });
      return;
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      const reason = err.details?.reason;

      if (reason === 'PATIENT_NOT_FOUND' || reason === 'ALREADY_BOOKED_THAT_DAY') {
        await waitlistModel.remove(doctorId, slot.day, patientId);
        await logAudit('WAITLIST_REMOVED', { patient_id: patientId, doctor_id: doctorId, date: slot.day, reason });
        continue;
      }
      if (reason === 'PATIENT_DOUBLE_BOOKED') {
        await logAudit('WAITLIST_SKIPPED', { patient_id: patientId, doctor_id: doctorId, appt_datetime: slot.sql, reason });
        continue;
      }
      await logAudit('WAITLIST_SLOT_UNAVAILABLE', { doctor_id: doctorId, appt_datetime: slot.sql, reason });
      return;
    }
  }
}

module.exports = {
  [JOB_TYPES.SEND_CONFIRMATION]: sendConfirmation,
  [JOB_TYPES.SLOT_FREED]: promoteFromWaitlist,
};
