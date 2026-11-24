const AppError = require('../utils/AppError');

// Returns 404 for routes that do not exist.
function notFound(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// Converts known MySQL errors into AppErrors with the right status code.
function fromMysql(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      if (/uq_doctor_slot/.test(err.message)) {
        return new AppError(409, 'This doctor slot is already booked', { reason: 'SLOT_TAKEN' });
      }
      if (/email/.test(err.message)) {
        return new AppError(409, 'A patient with this email already exists');
      }
      return new AppError(409, 'Duplicate value violates a unique constraint');
    case 'ER_ROW_IS_REFERENCED_2':
    case 'ER_ROW_IS_REFERENCED':
      return new AppError(409, 'Cannot delete: this record has appointments (kept for history)');
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_NO_REFERENCED_ROW':
      return new AppError(404, 'Referenced patient or doctor does not exist');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new AppError(422, 'Value violates a database constraint');
    default:
      return null;
  }
}

// Sends every error as a JSON response with the right status code.
function errorHandler(err, req, res, next) {
  let error = err;

  if (err.type === 'entity.parse.failed') {
    error = new AppError(400, 'Request body is not valid JSON');
  } else if (!(err instanceof AppError)) {
    error = fromMysql(err) || err;
  }

  const status = error instanceof AppError ? error.status : 500;
  if (status >= 500) console.error(err);

  const body = { error: status >= 500 ? 'Internal server error' : error.message };
  if (error.details !== undefined && status < 500) body.details = error.details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
