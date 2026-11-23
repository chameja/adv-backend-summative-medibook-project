const { Router } = require('express');
const controller = require('../controllers/reportController');

const router = Router();

router.get('/doctors', controller.doctors);
router.get('/busy-days', controller.busyDays);

module.exports = router;
