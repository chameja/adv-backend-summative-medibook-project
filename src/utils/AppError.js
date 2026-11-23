// An error that carries an HTTP status code. Thrown by controllers/validators
// and turned into a JSON response by the central error handler.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

module.exports = AppError;
