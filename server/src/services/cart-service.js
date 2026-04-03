const prisma = require('../lib/prisma');
const { createHttpError } = require('../middleware/http-error');
const {
  MAX_CART_QUANTITY,
  aggregateCartItems,
  getCurrentCartItems,
  serializeCartItems
} = require('./cart/cart-items');
const {
  clearActiveCartPointer,
  clearLegacySessionCart,
  ensureActiveCart,
  ensureCartSnapshot,
  findActiveCart
} = require('./cart/cart-store');

const getCart = async function (req) {
  const cart = await findActiveCart(req);

  if (!cart) {
    return [];
  }

  return serializeCartItems(cart.items);
};

const getActiveCartRecord = function (req) {
  return findActiveCart(req);
};

const addItem = async function (req, payload = {}) {
  const bookId = Number(payload.bookId);
  const quantity = Math.max(1, Math.trunc(Number(payload.quantity || 1)));
  const requestedHandle = String(payload.handle || '').trim();

  if (!Number.isFinite(bookId)) {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  const cart = await ensureActiveCart(req);
  const nextItems = getCurrentCartItems(cart);
  const existingItem = nextItems.find(function (item) {
    return item.bookId === bookId;
  });

  if (existingItem) {
    existingItem.quantity = Math.min(MAX_CART_QUANTITY, existingItem.quantity + quantity);

    if (requestedHandle) {
      existingItem.handle = requestedHandle;
    }
  } else {
    nextItems.push({
      bookId,
      quantity,
      ...(requestedHandle ? { handle: requestedHandle } : {})
    });
  }

  const nextCart = await ensureCartSnapshot(req, cart, nextItems);
  return serializeCartItems(nextCart?.items || []);
};

const replaceCart = async function (req, items) {
  const nextItems = aggregateCartItems(items);
  const cart = nextItems.length > 0
    ? await ensureActiveCart(req)
    : await findActiveCart(req);

  if (!cart) {
    clearLegacySessionCart(req);
    return [];
  }

  const nextCart = await ensureCartSnapshot(req, cart, nextItems);
  return serializeCartItems(nextCart?.items || []);
};

const updateItemQuantity = async function (req, bookId, delta) {
  const normalizedBookId = Number(bookId);
  const normalizedDelta = Math.trunc(Number(delta));

  if (!Number.isFinite(normalizedBookId) || !Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    throw createHttpError(400, 'CART_INVALID_MUTATION', 'Cap nhat gio hang khong hop le.');
  }

  const cart = await findActiveCart(req);

  if (!cart) {
    return [];
  }

  const nextItems = getCurrentCartItems(cart)
    .map(function (item) {
      if (item.bookId !== normalizedBookId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.min(MAX_CART_QUANTITY, item.quantity + normalizedDelta)
      };
    })
    .filter(function (item) {
      return item.quantity > 0;
    });

  const nextCart = await ensureCartSnapshot(req, cart, nextItems);
  return serializeCartItems(nextCart?.items || []);
};

const removeItem = async function (req, bookId) {
  const normalizedBookId = Number(bookId);

  if (!Number.isFinite(normalizedBookId)) {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  const cart = await findActiveCart(req);

  if (!cart) {
    return [];
  }

  const nextItems = getCurrentCartItems(cart).filter(function (item) {
    return item.bookId !== normalizedBookId;
  });

  const nextCart = await ensureCartSnapshot(req, cart, nextItems);
  return serializeCartItems(nextCart?.items || []);
};

const markCartConverted = function (cartId, client = prisma) {
  const normalizedCartId = String(cartId || '').trim();

  if (!normalizedCartId) {
    throw createHttpError(500, 'CART_UNAVAILABLE', 'Gio hang khong kha dung.');
  }

  return client.cart.update({
    where: {
      id: normalizedCartId
    },
    data: {
      status: 'CONVERTED'
    }
  });
};

module.exports = {
  addItem,
  clearActiveCartPointer,
  getCart,
  getActiveCartRecord,
  markCartConverted,
  removeItem,
  replaceCart,
  updateItemQuantity
};
