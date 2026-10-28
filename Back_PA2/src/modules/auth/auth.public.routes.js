const { Router } = require('express');
const authController = require('./auth.controller');

const router = Router();

router.post('/register', authController.register);

module.exports = router;