const { Router } = require('express');
const authController = require('./auth.controller');
const { requireRole } = require('../../shared/middlewares/auth.middleware');

const router = Router();

router.get('/me', authController.me);
router.post('/schedulers', requireRole('Admin'), authController.createScheduler);
router.get('/users', authController.findByRole);
router.get('/users/cod/:codigo', authController.findByCodigo);
router.get('/users/:cedula', authController.findByCedula);
router.put('/users/:id', authController.update);
router.delete('/users/:id', authController.deactivate);

module.exports = router;