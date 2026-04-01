const express = require('express');
const adminRoutes = require('./admin-routes');
const authRoutes = require('./auth-routes');
const cartRoutes = require('./cart-routes');
const catalogRoutes = require('./catalog-routes');
const contactController = require('../controllers/contact-controller');
const { requireActiveUser } = require('../middleware/require-active-user');
const orderController = require('../controllers/order-controller');

const router = express.Router();

router.use('/catalog', catalogRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/admin', adminRoutes);
router.post('/contact', contactController.submitContact);
router.post('/checkout', requireActiveUser, orderController.checkout);
router.get('/orders', requireActiveUser, orderController.listOrders);
router.get('/orders/:orderId', requireActiveUser, orderController.getOrderById);

module.exports = router;
