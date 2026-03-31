const express = require('express');
const authRoutes = require('./auth-routes');
const cartRoutes = require('./cart-routes');
const catalogRoutes = require('./catalog-routes');
const contactController = require('../controllers/contact-controller');
const orderController = require('../controllers/order-controller');

const router = express.Router();

router.use('/catalog', catalogRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.post('/contact', contactController.submitContact);
router.post('/checkout', orderController.checkout);
router.get('/orders', orderController.listOrders);
router.get('/orders/:orderId', orderController.getOrderById);

module.exports = router;
