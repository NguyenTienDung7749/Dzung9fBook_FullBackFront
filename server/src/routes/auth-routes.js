const express = require('express');
const authController = require('../controllers/auth-controller');
const { requireActiveUser } = require('../middleware/require-active-user');

const router = express.Router();

router.get('/me', authController.getSession);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.patch('/profile', requireActiveUser, authController.updateProfile);

module.exports = router;
