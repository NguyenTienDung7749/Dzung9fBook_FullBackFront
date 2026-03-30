const { createHttpError } = require('../middleware/http-error');
const { resolveLegacyBookId } = require('./catalog-service');

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

const getSessionCart = function (req) {
  return (Array.isArray(req.session?.cart) ? req.session.cart : [])
    .map(normalizeCartItem)
    .filter(Boolean);
};

const setSessionCart = function (req, items) {
  const nextItems = (Array.isArray(items) ? items : [])
    .map(normalizeCartItem)
    .filter(Boolean);

  if (nextItems.length) {
    req.session.cart = nextItems;
  } else {
    delete req.session.cart;
  }

  return nextItems;
};

const enrichCartHandles = async function (items) {
  return Promise.all((Array.isArray(items) ? items : []).map(async function (item) {
    const handle = String(item.handle || '').trim() || await resolveLegacyBookId(item.bookId);

    return handle
      ? { ...item, handle }
      : item;
  }));
};

const getCart = async function (req) {
  const hydratedCart = await enrichCartHandles(getSessionCart(req));
  return setSessionCart(req, hydratedCart);
};

const addItem = async function (req, payload = {}) {
  const bookId = Number(payload.bookId);
  const quantity = Math.max(1, Math.trunc(Number(payload.quantity || 1)));
  const requestedHandle = String(payload.handle || '').trim();

  if (!Number.isFinite(bookId)) {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  const cart = getSessionCart(req);
  const existingItem = cart.find((item) => item.bookId === bookId);

  if (existingItem) {
    existingItem.quantity = Math.min(MAX_CART_QUANTITY, existingItem.quantity + quantity);

    if (requestedHandle) {
      existingItem.handle = requestedHandle;
    }
  } else {
    cart.push({
      bookId,
      quantity,
      ...(requestedHandle ? { handle: requestedHandle } : {})
    });
  }

  return setSessionCart(req, await enrichCartHandles(cart));
};

const replaceCart = async function (req, items) {
  const nextItems = (Array.isArray(items) ? items : [])
    .map(normalizeCartItem)
    .filter(Boolean);

  return setSessionCart(req, await enrichCartHandles(nextItems));
};

const updateItemQuantity = async function (req, bookId, delta) {
  const normalizedBookId = Number(bookId);
  const normalizedDelta = Math.trunc(Number(delta));

  if (!Number.isFinite(normalizedBookId) || !Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    throw createHttpError(400, 'CART_INVALID_MUTATION', 'Cap nhat gio hang khong hop le.');
  }

  const nextItems = getSessionCart(req)
    .map((item) => {
      if (item.bookId !== normalizedBookId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.min(MAX_CART_QUANTITY, item.quantity + normalizedDelta)
      };
    })
    .filter((item) => item.quantity > 0);

  return setSessionCart(req, await enrichCartHandles(nextItems));
};

const removeItem = async function (req, bookId) {
  const normalizedBookId = Number(bookId);

  if (!Number.isFinite(normalizedBookId)) {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  const nextItems = getSessionCart(req).filter((item) => item.bookId !== normalizedBookId);
  return setSessionCart(req, await enrichCartHandles(nextItems));
};

module.exports = {
  addItem,
  getCart,
  removeItem,
  replaceCart,
  updateItemQuantity
};
