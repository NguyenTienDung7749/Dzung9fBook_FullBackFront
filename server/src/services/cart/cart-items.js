const { createHttpError } = require('../../middleware/http-error');
const { resolveLegacyBookId } = require('../catalog-service');

const MAX_CART_QUANTITY = 99;

const normalizeCartItem = function (item) {
  const bookId = Number(item?.bookId);
  const quantity = Math.trunc(Number(item?.quantity));

  if (!Number.isFinite(bookId) || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const handle = String(item?.handle || '').trim();

  return {
    bookId,
    quantity: Math.min(MAX_CART_QUANTITY, quantity),
    ...(handle ? { handle } : {})
  };
};

const aggregateCartItems = function (items) {
  const aggregatedItems = new Map();

  (Array.isArray(items) ? items : [])
    .map(normalizeCartItem)
    .filter(Boolean)
    .forEach(function (item) {
      const existingItem = aggregatedItems.get(item.bookId);

      if (existingItem) {
        existingItem.quantity = Math.min(MAX_CART_QUANTITY, existingItem.quantity + item.quantity);

        if (item.handle) {
          existingItem.handle = item.handle;
        }

        return;
      }

      aggregatedItems.set(item.bookId, { ...item });
    });

  return Array.from(aggregatedItems.values());
};

const serializeCartItems = async function (items) {
  return Promise.all((Array.isArray(items) ? items : []).map(async function (item) {
    const normalizedItem = normalizeCartItem({
      bookId: item?.bookId,
      quantity: item?.quantity,
      handle: item?.book?.handle
    });

    if (!normalizedItem) {
      return null;
    }

    if (normalizedItem.handle) {
      return normalizedItem;
    }

    const handle = await resolveLegacyBookId(normalizedItem.bookId);

    return handle
      ? { ...normalizedItem, handle }
      : normalizedItem;
  })).then(function (nextItems) {
    return nextItems.filter(Boolean);
  });
};

const getCurrentCartItems = function (cart) {
  return (Array.isArray(cart?.items) ? cart.items : [])
    .map(function (item) {
      return normalizeCartItem({
        bookId: item.bookId,
        quantity: item.quantity,
        handle: item?.book?.handle
      });
    })
    .filter(Boolean);
};

const handleCartWriteError = function (error) {
  if (error?.code === 'P2003') {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  throw error;
};

module.exports = {
  MAX_CART_QUANTITY,
  aggregateCartItems,
  getCurrentCartItems,
  handleCartWriteError,
  normalizeCartItem,
  serializeCartItems
};
