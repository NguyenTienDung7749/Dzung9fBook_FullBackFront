const express = require('express');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.get('/me', authController.getSession);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

module.exports = router;
