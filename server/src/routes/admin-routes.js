const express = require('express');
const adminMessageController = require('../controllers/admin-message-controller');
const adminOrderController = require('../controllers/admin-order-controller');
const { requireRole } = require('../middleware/require-role');

const router = express.Router();

router.use(requireRole(['staff', 'admin']));

router.get('/orders', adminOrderController.listOrders);
router.patch('/orders/:id/status', adminOrderController.updateOrderStatus);
router.get('/messages', adminMessageController.listMessages);
router.patch('/messages/:id/status', adminMessageController.updateMessageStatus);

module.exports = router;
