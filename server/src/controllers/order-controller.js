const orderService = require('../services/order-service');

const checkout = async function (req, res, next) {
  try {
    const order = await orderService.createCheckoutOrder(req, req.body);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

const listOrders = async function (req, res, next) {
  try {
    res.json({
      items: await orderService.listOrdersForCurrentUser(req.currentUser.id)
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async function (req, res, next) {
  try {
    res.json({
      order: await orderService.getOrderDetailForCurrentUser(req.currentUser.id, req.params.orderId)
    });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async function (req, res, next) {
  try {
    res.json({
      order: await orderService.cancelOrderForCurrentUser(req.currentUser.id, req.params.orderId)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cancelOrder,
  checkout,
  getOrderById,
  listOrders
};
