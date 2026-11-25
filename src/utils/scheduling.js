const OPENING_MINUTES = 9 * 60;
const CLOSING_MINUTES = 17 * 60;
const SLOT_MINUTES = 30;
const MAX_APPOINTMENTS_PER_DAY = 12;

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (n) => String(n).padStart(2, '0');

// Parses a "YYYY-MM-DD HH:MM" string into a Date and SQL datetime, or returns null if invalid.
function parseDateTime(value) {
  if (typeof value !== 'string') return null;
  const m = DATETIME_PATTERN.exec(value.trim());
  if (!m) return null;

  const [year, month, day, hour, minute] = m.slice(1, 6).map(Number);
  const second = m[6] === undefined ? 0 : Number(m[6]);
  if (hour > 23 || minute > 59 || second > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, second);
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

// Parses a "YYYY-MM-DD" calendar day and returns it, or null if invalid.
function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseDateTime(`${value} 00:00`);
  return parsed ? parsed.day : null;
}

// Checks a requested time is in the future, within 09:00-17:00 and on a 30-minute boundary.
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

// Returns the refund percentage for the hours of notice: >48h 100%, 24-48h 50%, <24h 0%.
function refundPercentage(hoursNotice) {
  if (hoursNotice > 48) return 100;
  if (hoursNotice >= 24) return 50;
  return 0;
}

// Computes the refund amount for a cancellation from the amount paid and the notice given.
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

// Formats a Date as a MySQL DATETIME string in local time.
function toSqlDateTime(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

module.exports = {
  OPENING_MINUTES,
  CLOSING_MINUTES,
  SLOT_MINUTES,
  MAX_APPOINTMENTS_PER_DAY,
  parseDateTime,
  parseDay,
  validateSlot,
  refundPercentage,
  calculateRefund,
  toSqlDateTime,
};

