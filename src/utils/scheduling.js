// Pure scheduling rules — no DB, no Express — so they can be unit-tested (Part F).

const OPENING_MINUTES = 9 * 60; // 09:00
const CLOSING_MINUTES = 17 * 60; // 17:00 — the last slot starts at 16:30
const SLOT_MINUTES = 30;
const MAX_APPOINTMENTS_PER_DAY = 12;

// Accepts "YYYY-MM-DD HH:MM", "YYYY-MM-DDTHH:MM" and an optional ":SS".
// No timezone suffix is allowed: times are clinic-local wall-clock times.
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (n) => String(n).padStart(2, '0');

/**
 * Parse a clinic-local datetime string.
 * Returns { date: Date, sql: 'YYYY-MM-DD HH:MM:SS', day: 'YYYY-MM-DD', minutes, seconds }
 * or null when the string is malformed or not a real calendar date/time.
 */
function parseDateTime(value) {
  if (typeof value !== 'string') return null;
  const m = DATETIME_PATTERN.exec(value.trim());
  if (!m) return null;

  const [year, month, day, hour, minute] = m.slice(1, 6).map(Number);
  const second = m[6] === undefined ? 0 : Number(m[6]);
  if (hour > 23 || minute > 59 || second > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, second);
  // Rejects impossible dates such as 2026-02-30 (JS would roll them over).
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  const dayStr = `${year}-${pad(month)}-${pad(day)}`;
  return {
    date,
    day: dayStr,
    sql: `${dayStr} ${pad(hour)}:${pad(minute)}:${pad(second)}`,
    minutes: hour * 60 + minute,
    seconds: second,
  };
}

/**
 * Check that a requested appointment time is bookable.
 * Returns { ok: true, slot } or { ok: false, reason, message }.
 *   reason 'MALFORMED'    -> caller should answer 400
 *   any other reason      -> well-formed but breaks a business rule (422)
 */
function validateSlot(value, now = new Date()) {
  const slot = parseDateTime(value);
  if (!slot) {
    return {
      ok: false,
      reason: 'MALFORMED',
      message: 'appt_datetime must be a valid date-time in the form "YYYY-MM-DD HH:MM"',
    };
  }
  if (slot.seconds !== 0 || slot.minutes % SLOT_MINUTES !== 0) {
    return {
      ok: false,
      reason: 'NOT_ON_SLOT_BOUNDARY',
      message: 'Appointments start on the hour or half-hour (e.g. 09:00, 09:30)',
    };
  }
  if (slot.minutes < OPENING_MINUTES || slot.minutes + SLOT_MINUTES > CLOSING_MINUTES) {
    return {
      ok: false,
      reason: 'OUTSIDE_WORKING_HOURS',
      message: 'Appointments must be between 09:00 and 17:00 (last slot starts at 16:30)',
    };
  }
  if (slot.date.getTime() <= now.getTime()) {
    return { ok: false, reason: 'IN_THE_PAST', message: 'Appointments can only be booked in the future' };
  }
  return { ok: true, slot };
}

/**
 * Refund policy (documented in README):
 *   notice  > 48h        -> 100%
 *   24h <= notice <= 48h -> 50%   (exactly 48h and exactly 24h both get 50%)
 *   notice  < 24h        -> 0%
 * Amounts are handled in integer cents to avoid floating-point drift.
 */
function refundPercentage(hoursNotice) {
  if (hoursNotice > 48) return 100;
  if (hoursNotice >= 24) return 50;
  return 0;
}

function calculateRefund(amountPaid, appointmentDate, cancelledAt = new Date()) {
  const hoursNotice = (appointmentDate.getTime() - cancelledAt.getTime()) / (60 * 60 * 1000);
  const percentage = refundPercentage(hoursNotice);
  const cents = Math.round(Number(amountPaid) * 100);
  const refundCents = Math.round((cents * percentage) / 100);
  return {
    hoursNotice,
    percentage,
    refundAmount: (refundCents / 100).toFixed(2),
  };
}

module.exports = {
  OPENING_MINUTES,
  CLOSING_MINUTES,
  SLOT_MINUTES,
  MAX_APPOINTMENTS_PER_DAY,
  parseDateTime,
  validateSlot,
  refundPercentage,
  calculateRefund,
};

/** Format a JS Date as a clinic-local MySQL DATETIME string. */
function toSqlDateTime(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

module.exports.toSqlDateTime = toSqlDateTime;
