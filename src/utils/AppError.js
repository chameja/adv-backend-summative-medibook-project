// Error with an HTTP status code, turned into a JSON response by the error handler.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

module.exports = AppError;
