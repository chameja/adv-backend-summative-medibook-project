const patientModel = require('../models/patientModel');
const AppError = require('../utils/AppError');
const { validatePatient, parseId } = require('../utils/validators');

// Throws a 400 error if validation found any problems.
function assertValid({ errors }) {
  if (errors.length) throw new AppError(400, 'Validation failed', errors);
}

// Lists all patients.
async function list(req, res) {
  res.json(await patientModel.findAll());
}

// Returns one patient or 404.
async function getOne(req, res) {
  const patient = await patientModel.findById(parseId(req.params.id));
  if (!patient) throw new AppError(404, 'Patient not found');
  res.json(patient);
}

// Creates a patient and returns 201.
async function create(req, res) {
  const result = validatePatient(req.body);
  assertValid(result);
  const patient = await patientModel.create(result.values);
  res.status(201).location(`/api/patients/${patient.patient_id}`).json(patient);
}

// Builds a handler for PUT (full replace) or PATCH (partial update) of a patient.
function update({ partial }) {
  return async (req, res) => {
    const id = parseId(req.params.id);
    const result = validatePatient(req.body, { partial });
    assertValid(result);
    const patient = await patientModel.update(id, result.values);
    if (!patient) throw new AppError(404, 'Patient not found');
    res.json(patient);
  };
}

// Deletes a patient and returns 204.
async function remove(req, res) {
  const deleted = await patientModel.remove(parseId(req.params.id));
  if (!deleted) throw new AppError(404, 'Patient not found');
  res.status(204).end();
}

module.exports = {
  list,
  getOne,
  create,
  replace: update({ partial: false }),
  patch: update({ partial: true }),
  remove,
};
