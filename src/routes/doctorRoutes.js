const { Router } = require('express');
const controller = require('../controllers/doctorController');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', controller.replace);
router.patch('/:id', controller.patch);
router.delete('/:id', controller.remove);
router.get('/:id/stats', controller.stats);

module.exports = router;
