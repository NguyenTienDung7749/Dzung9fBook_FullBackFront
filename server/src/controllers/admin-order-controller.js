const orderService = require('../services/order-service');

const listOrders = async function (req, res, next) {
  try {
    res.json({
      items: await orderService.listAdminOrders(req.query)
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async function (req, res, next) {
  try {
    res.json({
      order: await orderService.updateAdminOrderStatus(req.params.id, req.body)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listOrders,
  updateOrderStatus
};
