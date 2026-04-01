const express = require('express');
const adminAuthController = require('../controllers/admin-auth-controller');
const adminBookController = require('../controllers/admin-book-controller');
const adminMessageController = require('../controllers/admin-message-controller');
const adminOrderController = require('../controllers/admin-order-controller');
const { requireRole } = require('../middleware/require-role');

const router = express.Router();

router.use(requireRole(['staff', 'admin']));

router.get('/me', adminAuthController.getAdminMe);
router.get('/books', adminBookController.listBooks);
router.patch('/books/:id/inventory', adminBookController.updateInventory);
router.get('/orders', adminOrderController.listOrders);
router.patch('/orders/:id/status', adminOrderController.updateOrderStatus);
router.get('/messages', adminMessageController.listMessages);
router.patch('/messages/:id/status', adminMessageController.updateMessageStatus);

module.exports = router;
