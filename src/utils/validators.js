// Pure input validators for request bodies and URL params.
// Each returns a list of error messages (empty = valid) so all problems are
// reported in one 400 response rather than one at a time.

const AppError = require('./AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/;
const MONEY_PATTERN = /^\d{1,6}(\.\d{1,2})?$/; // fits DECIMAL(8,2)

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function checkString(errors, body, field, maxLength) {
  const value = body[field];
  if (!isNonEmptyString(value)) {
    errors.push(`${field} is required and must be a non-empty string`);
  } else if (value.trim().length > maxLength) {
    errors.push(`${field} must be at most ${maxLength} characters`);
  }
}

// Field rules shared by create (all required) and partial update (only those sent).
const PATIENT_RULES = {
  full_name: (errors, body) => checkString(errors, body, 'full_name', 100),
  email: (errors, body) => {
    checkString(errors, body, 'email', 255);
    if (isNonEmptyString(body.email) && !EMAIL_PATTERN.test(body.email.trim())) {
      errors.push('email must be a valid email address');
    }
  },
  phone: (errors, body) => {
    checkString(errors, body, 'phone', 20);
    if (isNonEmptyString(body.phone) && !PHONE_PATTERN.test(body.phone.trim())) {
      errors.push('phone may contain only digits, spaces, dashes and a leading +');
    }
  },
};

const DOCTOR_RULES = {
  full_name: (errors, body) => checkString(errors, body, 'full_name', 100),
  specialty: (errors, body) => checkString(errors, body, 'specialty', 100),
  room: (errors, body) => checkString(errors, body, 'room', 50),
  consultation_fee: (errors, body) => {
    const fee = body.consultation_fee;
    const asString = typeof fee === 'number' ? String(fee) : fee;
    if (
      (typeof fee !== 'number' && typeof fee !== 'string') ||
      !MONEY_PATTERN.test(String(asString).trim()) ||
      Number(fee) <= 0
    ) {
      errors.push('consultation_fee must be a positive amount with at most 2 decimal places (max 999999.99)');
    }
  },
};

/**
 * Validate a body against a rule set.
 *   partial = false -> every field is required (POST / PUT)
 *   partial = true  -> only fields present are checked, at least one required (PATCH)
 * Unknown fields are rejected so typos don't silently do nothing.
 * Returns { errors, values } where values holds the trimmed, whitelisted fields.
 */
function validateBody(rules, body, { partial = false } = {}) {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object'], values: {} };
  }

  const allowed = Object.keys(rules);
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unknown.length) errors.push(`Unknown field(s): ${unknown.join(', ')}`);

  const fields = partial ? allowed.filter((f) => body[f] !== undefined) : allowed;
  if (partial && fields.length === 0) {
    errors.push(`Provide at least one of: ${allowed.join(', ')}`);
  }

  const values = {};
  for (const field of fields) {
    const before = errors.length;
    rules[field](errors, body);
    if (errors.length === before) {
      const v = body[field];
      values[field] = typeof v === 'string' ? v.trim() : v;
    }
  }
  if (values.email) values.email = values.email.toLowerCase();
  if (values.consultation_fee !== undefined) values.consultation_fee = Number(values.consultation_fee).toFixed(2);

  return { errors, values };
}

const validatePatient = (body, opts) => validateBody(PATIENT_RULES, body, opts);
const validateDoctor = (body, opts) => validateBody(DOCTOR_RULES, body, opts);

/** Parse a positive integer id (URL param or body field) or throw a 400. */
function parseId(value, name = 'id') {
  const str = typeof value === 'number' ? String(value) : value;
  if (typeof str !== 'string' || !/^[1-9]\d{0,9}$/.test(str) || Number(str) > 2147483647) {
    throw new AppError(400, `${name} must be a positive integer`);
  }
  return Number(str);
}

module.exports = { validatePatient, validateDoctor, parseId };
