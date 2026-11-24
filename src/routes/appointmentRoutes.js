const { Router } = require('express');
const controller = require('../controllers/appointmentController');

const router = Router();

router.post('/', controller.book);
router.get('/:id', controller.getOne);
router.delete('/:id', controller.cancel);

module.exports = router;
