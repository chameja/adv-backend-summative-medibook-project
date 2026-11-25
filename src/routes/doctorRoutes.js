const { Router } = require('express');
const controller = require('../controllers/doctorController');
const waitlist = require('../controllers/waitlistController');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', controller.replace);
router.patch('/:id', controller.patch);
router.delete('/:id', controller.remove);
router.get('/:id/stats', controller.stats);
router.get('/:id/waitlist/:date', waitlist.list);
router.post('/:id/waitlist/:date', waitlist.join);
router.delete('/:id/waitlist/:date/:patientId', waitlist.leave);

module.exports = router;
