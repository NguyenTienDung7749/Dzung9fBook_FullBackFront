const { createHttpError } = require('../middleware/http-error');
const orderService = require('../services/order-service');

const requireAuthenticatedUser = function (req) {
  const currentUser = req.session?.user || null;

  if (!currentUser?.id) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  return currentUser;
};

const checkout = async function (req, res, next) {
  try {
    requireAuthenticatedUser(req);
    const order = await orderService.createCheckoutOrder(req, req.body);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

const listOrders = async function (req, res, next) {
  try {
    const currentUser = requireAuthenticatedUser(req);
    res.json({
      items: await orderService.listOrdersForCurrentUser(currentUser.id)
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async function (req, res, next) {
  try {
    const currentUser = requireAuthenticatedUser(req);
    res.json({
      order: await orderService.getOrderDetailForCurrentUser(currentUser.id, req.params.orderId)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  getOrderById,
  listOrders
};
