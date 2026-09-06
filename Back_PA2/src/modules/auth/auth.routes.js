const { Router } = require('express');
const authController = require('./auth.controller');

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/users', authController.findByRole);
router.get('/users/cod/:codigo', authController.findByCodigo);
router.get('/users/:cedula', authController.findByCedula);
router.put('/users/:id', authController.update);
router.delete('/users/:id', authController.deactivate);

module.exports = router;
