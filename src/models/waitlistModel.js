const redis = require('../config/redis');

const JOIN_SCRIPT = `
if redis.call('LPOS', KEYS[1], ARGV[1]) then return -1 end
local position = redis.call('RPUSH', KEYS[1], ARGV[1])
redis.call('EXPIREAT', KEYS[1], ARGV[2])
return position
`;

// Returns the Redis key of the waitlist for one doctor on one day.
function waitlistKey(doctorId, day) {
  return `medibook:waitlist:${doctorId}:${day}`;
}

// Returns the Unix time one day after the given day ends, when its waitlist can expire.
function expiryFor(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(new Date(y, m - 1, d + 2).getTime() / 1000);
}

// Adds a patient to the end of a waitlist and returns their position, or null if already on it.
async function join(doctorId, day, patientId) {
  const position = await redis.eval(JOIN_SCRIPT, {
    keys: [waitlistKey(doctorId, day)],
    arguments: [String(patientId), String(expiryFor(day))],
  });
  return position === -1 ? null : Number(position);
}

// Returns the patient ids on a waitlist, first in line first.
async function list(doctorId, day) {
  const ids = await redis.lRange(waitlistKey(doctorId, day), 0, -1);
  return ids.map(Number);
}

// Removes a patient from a waitlist and returns whether they were on it.
async function remove(doctorId, day, patientId) {
  const removed = await redis.lRem(waitlistKey(doctorId, day), 1, String(patientId));
  return removed > 0;
}

module.exports = { join, list, remove };
