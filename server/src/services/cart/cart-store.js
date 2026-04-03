const prisma = require('../../lib/prisma');
const { createHttpError } = require('../../middleware/http-error');
const {
  aggregateCartItems,
  handleCartWriteError,
  normalizeCartItem
} = require('./cart-items');

const CART_INCLUDE = {
  items: {
    orderBy: {
      id: 'asc'
    },
    include: {
      book: {
        select: {
          handle: true,
          title: true,
          price: true
        }
      }
    }
  }
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

const clearActiveCartPointer = function (req) {
  clearLegacySessionCart(req);
  setStoredCartId(req, null);
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
  return nextCart;
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

module.exports = {
  clearActiveCartPointer,
  clearLegacySessionCart,
  ensureActiveCart,
  ensureCartSnapshot,
  findActiveCart,
  loadCartById
};
