const express = require('express');
const authRoutes = require('./auth-routes');
const cartRoutes = require('./cart-routes');
const catalogRoutes = require('./catalog-routes');

const router = express.Router();

router.use('/catalog', catalogRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);

module.exports = router;
