const doctorModel = require('../models/doctorModel');
const AppError = require('../utils/AppError');
const { validateDoctor, parseId } = require('../utils/validators');
const { MAX_APPOINTMENTS_PER_DAY } = require('../utils/scheduling');

// Throws a 400 error if validation found any problems.
function assertValid({ errors }) {
  if (errors.length) throw new AppError(400, 'Validation failed', errors);
}

// Lists all doctors.
async function list(req, res) {
  res.json(await doctorModel.findAll());
}

// Returns one doctor or 404.
async function getOne(req, res) {
  const doctor = await doctorModel.findById(parseId(req.params.id));
  if (!doctor) throw new AppError(404, 'Doctor not found');
  res.json(doctor);
}

// Creates a doctor and returns 201.
async function create(req, res) {
  const result = validateDoctor(req.body);
  assertValid(result);
  const doctor = await doctorModel.create(result.values);
  res.status(201).location(`/api/doctors/${doctor.doctor_id}`).json(doctor);
}

// Builds a handler for PUT (full replace) or PATCH (partial update) of a doctor.
function update({ partial }) {
  return async (req, res) => {
    const id = parseId(req.params.id);
    const result = validateDoctor(req.body, { partial });
    assertValid(result);
    const doctor = await doctorModel.update(id, result.values);
    if (!doctor) throw new AppError(404, 'Doctor not found');
    res.json(doctor);
  };
}

// Deletes a doctor and returns 204.
async function remove(req, res) {
  const deleted = await doctorModel.remove(parseId(req.params.id));
  if (!deleted) throw new AppError(404, 'Doctor not found');
  res.status(204).end();
}

// Returns statistics for one doctor.
async function stats(req, res) {
  const id = parseId(req.params.id);
  const doctor = await doctorModel.findById(id);
  if (!doctor) throw new AppError(404, 'Doctor not found');

  const { summary, perDay, utilization } = await doctorModel.getStats(id, MAX_APPOINTMENTS_PER_DAY);
  res.json({
    doctor_id: doctor.doctor_id,
    full_name: doctor.full_name,
    revenue_collected: summary.revenue_collected,
    upcoming_appointments: Number(summary.upcoming_count),
    daily_capacity: MAX_APPOINTMENTS_PER_DAY,
    next_7_days: {
      booked: Number(utilization.booked_next_7_days),
      capacity: MAX_APPOINTMENTS_PER_DAY * perDay.length,
      utilization_pct: Number(utilization.utilization_pct),
      per_day: perDay.map((d) => ({
        date: d.date,
        appointments: Number(d.appointments),
        utilization_pct: Number(d.utilization_pct),
      })),
    },
  });
}

module.exports = {
  list,
  getOne,
  create,
  replace: update({ partial: false }),
  patch: update({ partial: true }),
  remove,
  stats,
};
