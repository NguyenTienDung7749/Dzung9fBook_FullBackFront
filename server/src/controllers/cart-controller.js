const cartService = require('../services/cart-service');

const getCart = async function (req, res, next) {
  try {
    res.json({
      items: await cartService.getCart(req)
    });
  } catch (error) {
    next(error);
  }
};

const addCartItem = async function (req, res, next) {
  try {
    const items = Array.isArray(req.body?.items)
      ? await cartService.replaceCart(req, req.body.items)
      : await cartService.addItem(req, req.body);

    res.status(Array.isArray(req.body?.items) ? 200 : 201).json({ items });
  } catch (error) {
    next(error);
  }
};

const updateCartItemQuantity = async function (req, res, next) {
  try {
    res.json({
      items: await cartService.updateItemQuantity(req, req.params.bookId, req.body?.delta)
    });
  } catch (error) {
    next(error);
  }
};

const deleteCartItem = async function (req, res, next) {
  try {
    res.json({
      items: await cartService.removeItem(req, req.params.bookId)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addCartItem,
  deleteCartItem,
  getCart,
  updateCartItemQuantity
};
