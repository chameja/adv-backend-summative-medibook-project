const reportModel = require('../models/reportModel');
const { MAX_APPOINTMENTS_PER_DAY } = require('../utils/scheduling');

const BUSY_THRESHOLD_PCT = 80;

async function doctors(req, res) {
  res.json(await reportModel.doctorsReport());
}

async function busyDays(req, res) {
  res.json({
    daily_capacity: MAX_APPOINTMENTS_PER_DAY,
    threshold_pct: BUSY_THRESHOLD_PCT,
    busy_days: await reportModel.busyDaysReport(MAX_APPOINTMENTS_PER_DAY, BUSY_THRESHOLD_PCT),
  });
}

module.exports = { doctors, busyDays };
