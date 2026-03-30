const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');
const { resolveLegacyBookId } = require('./catalog-service');

const prisma = new PrismaClient();
const MAX_CART_QUANTITY = 99;
const CART_INCLUDE = {
  items: {
    orderBy: {
      id: 'asc'
    },
    include: {
      book: {
        select: {
          handle: true
        }
      }
    }
  }
};

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

const getCurrentUserId = function (req) {
  const userId = String(req.session?.user?.id || '').trim();
  return userId || null;
};

const getGuestToken = function (req) {
  const guestToken = String(req.sessionID || '').trim();

  if (!guestToken) {
    throw createHttpError(500, 'SESSION_UNAVAILABLE', 'Phien lam viec khong kha dung.');
  }

  return guestToken;
};

const getStoredCartId = function (req) {
  const cartId = String(req.session?.cartId || '').trim();
  return cartId || null;
};

const setStoredCartId = function (req, cartId) {
  if (!req.session) {
    return;
  }

  const normalizedCartId = String(cartId || '').trim();

  if (normalizedCartId) {
    req.session.cartId = normalizedCartId;
  } else {
    delete req.session.cartId;
  }
};

const getLegacySessionCart = function (req) {
  return (Array.isArray(req.session?.cart) ? req.session.cart : [])
    .map(normalizeCartItem)
    .filter(Boolean);
};

const clearLegacySessionCart = function (req) {
  if (req.session && Object.prototype.hasOwnProperty.call(req.session, 'cart')) {
    delete req.session.cart;
  }
};

const loadCartById = async function (cartId) {
  const normalizedCartId = String(cartId || '').trim();

  if (!normalizedCartId) {
    return null;
  }

  return prisma.cart.findUnique({
    where: {
      id: normalizedCartId
    },
    include: CART_INCLUDE
  });
};

const loadCartByGuestToken = async function (guestToken) {
  const normalizedGuestToken = String(guestToken || '').trim();

  if (!normalizedGuestToken) {
    return null;
  }

  return prisma.cart.findFirst({
    where: {
      guestToken: normalizedGuestToken,
      status: 'ACTIVE'
    },
    orderBy: {
      updatedAt: 'desc'
    },
    include: CART_INCLUDE
  });
};

const ensureCartIdentity = async function (req, cart) {
  if (!cart) {
    setStoredCartId(req, null);
    return null;
  }

  if (cart.status !== 'ACTIVE') {
    setStoredCartId(req, null);
    return null;
  }

  const currentUserId = getCurrentUserId(req);
  const guestToken = getGuestToken(req);
  const nextData = {};

  if (cart.guestToken !== guestToken) {
    nextData.guestToken = guestToken;
  }

  if (currentUserId && cart.userId !== currentUserId) {
    nextData.userId = currentUserId;
  }

  if (Object.keys(nextData).length > 0) {
    cart = await prisma.cart.update({
      where: {
        id: cart.id
      },
      data: nextData,
      include: CART_INCLUDE
    });
  }

  clearLegacySessionCart(req);
  setStoredCartId(req, cart.id);
  return cart;
};

const importLegacySessionCart = async function (req, legacyItems) {
  const nextItems = aggregateCartItems(legacyItems);

  clearLegacySessionCart(req);

  if (!nextItems.length) {
    return null;
  }

  const guestToken = getGuestToken(req);
  const currentUserId = getCurrentUserId(req);
  let cart = await loadCartByGuestToken(guestToken);

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        guestToken,
        ...(currentUserId ? { userId: currentUserId } : {})
      },
      include: CART_INCLUDE
    });
  } else {
    cart = await ensureCartIdentity(req, cart);
  }

  return ensureCartSnapshot(req, cart, nextItems);
};

const findActiveCart = async function (req) {
  const storedCartId = getStoredCartId(req);

  if (storedCartId) {
    const cartById = await loadCartById(storedCartId);

    if (cartById?.status === 'ACTIVE') {
      return ensureCartIdentity(req, cartById);
    }

    setStoredCartId(req, null);
  }

  const guestToken = getGuestToken(req);
  const cartByGuestToken = await loadCartByGuestToken(guestToken);

  if (cartByGuestToken) {
    return ensureCartIdentity(req, cartByGuestToken);
  }

  const legacySessionCart = getLegacySessionCart(req);

  if (legacySessionCart.length > 0) {
    return importLegacySessionCart(req, legacySessionCart);
  }

  clearLegacySessionCart(req);
  return null;
};

const ensureActiveCart = async function (req) {
  const existingCart = await findActiveCart(req);

  if (existingCart) {
    return existingCart;
  }

  const guestToken = getGuestToken(req);
  const currentUserId = getCurrentUserId(req);
  const cart = await prisma.cart.create({
    data: {
      guestToken,
      ...(currentUserId ? { userId: currentUserId } : {})
    },
    include: CART_INCLUDE
  });

  clearLegacySessionCart(req);
  setStoredCartId(req, cart.id);
  return cart;
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

const handleCartWriteError = function (error) {
  if (error?.code === 'P2003') {
    throw createHttpError(400, 'CART_INVALID_BOOK', 'Book id khong hop le.');
  }

  throw error;
};

const ensureCartSnapshot = async function (req, cart, items) {
  const nextItems = aggregateCartItems(items);
  const currentUserId = getCurrentUserId(req);
  const guestToken = getGuestToken(req);

  try {
    await prisma.$transaction(async function (tx) {
      const nextCartData = {};

      if (cart.guestToken !== guestToken) {
        nextCartData.guestToken = guestToken;
      }

      if (currentUserId && cart.userId !== currentUserId) {
        nextCartData.userId = currentUserId;
      }

      if (Object.keys(nextCartData).length > 0) {
        await tx.cart.update({
          where: {
            id: cart.id
          },
          data: nextCartData
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id
        }
      });

      if (nextItems.length > 0) {
        await tx.cartItem.createMany({
          data: nextItems.map(function (item) {
            return {
              cartId: cart.id,
              bookId: item.bookId,
              quantity: item.quantity
            };
          })
        });
      }
    });
  } catch (error) {
    handleCartWriteError(error);
  }

  const nextCart = await loadCartById(cart.id);
  clearLegacySessionCart(req);
  setStoredCartId(req, cart.id);
  return serializeCartItems(nextCart?.items || []);
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

const getCart = async function (req) {
  const cart = await findActiveCart(req);

  if (!cart) {
    return [];
  }

  return serializeCartItems(cart.items);
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
  const existingItem = nextItems.find((item) => item.bookId === bookId);

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

  return ensureCartSnapshot(req, cart, nextItems);
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

  return ensureCartSnapshot(req, cart, nextItems);
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

  return ensureCartSnapshot(req, cart, nextItems);
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

  return ensureCartSnapshot(req, cart, nextItems);
};

module.exports = {
  addItem,
  getCart,
  removeItem,
  replaceCart,
  updateItemQuantity
};
