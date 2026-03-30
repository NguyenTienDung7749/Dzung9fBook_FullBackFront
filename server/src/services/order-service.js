const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');
const cartService = require('./cart-service');

const prisma = new PrismaClient();
const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotalAmount: true,
  totalAmount: true,
  createdAt: true
};
const ORDER_DETAIL_INCLUDE = {
  items: {
    orderBy: {
      id: 'asc'
    }
  }
};

const normalizeUserId = function (userId) {
  return String(userId || '').trim();
};

const normalizeOrderId = function (orderId) {
  return String(orderId || '').trim();
};

const normalizeText = function (value) {
  return String(value || '').trim();
};

const serializeTimestamp = function (value) {
  return value instanceof Date
    ? value.toISOString()
    : String(value || '');
};

const serializeCheckoutOrder = function (order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotalAmount: Number(order.subtotalAmount || 0),
    totalAmount: Number(order.totalAmount || 0),
    createdAt: serializeTimestamp(order.createdAt)
  };
};

const serializeOrderListItem = function (order) {
  const itemCount = (Array.isArray(order.items) ? order.items : []).reduce(function (sum, item) {
    return sum + Number(item?.quantity || 0);
  }, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: Number(order.totalAmount || 0),
    createdAt: serializeTimestamp(order.createdAt),
    itemCount
  };
};

const serializeOrderDetail = function (order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotalAmount: Number(order.subtotalAmount || 0),
    totalAmount: Number(order.totalAmount || 0),
    createdAt: serializeTimestamp(order.createdAt),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    note: order.note || null,
    items: (Array.isArray(order.items) ? order.items : []).map(function (item) {
      return {
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        bookHandle: item.bookHandle,
        unitPrice: Number(item.unitPrice || 0),
        quantity: Number(item.quantity || 0),
        lineTotal: Number(item.lineTotal || 0)
      };
    })
  };
};

const buildOrderNumber = function (now = new Date()) {
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = (typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`)
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  return `DZB-${dateStamp}-${suffix}`;
};

const validateCheckoutPayload = function (payload = {}) {
  const customerPhone = normalizeText(payload.customerPhone);
  const shippingAddress = normalizeText(payload.shippingAddress);
  const note = normalizeText(payload.note);

  if (!customerPhone || !shippingAddress) {
    throw createHttpError(400, 'CHECKOUT_INVALID_PAYLOAD', 'Thong tin giao hang chua day du.');
  }

  return {
    customerPhone,
    shippingAddress,
    note: note || null
  };
};

const buildOrderItemSnapshots = function (cart) {
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  if (!cartItems.length) {
    throw createHttpError(400, 'CHECKOUT_CART_EMPTY', 'Gio hang dang trong.');
  }

  return cartItems.map(function (item) {
    const book = item?.book;
    const unitPrice = Number(book?.price);
    const quantity = Number(item?.quantity);

    if (!book || !book.title || !book.handle || !Number.isFinite(unitPrice) || !Number.isFinite(quantity) || quantity <= 0) {
      throw createHttpError(500, 'CHECKOUT_BOOK_UNAVAILABLE', 'Khong the tao don hang tu gio hang hien tai.');
    }

    return {
      bookId: item.bookId,
      bookTitle: book.title,
      bookHandle: book.handle,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity
    };
  });
};

const createCheckoutOrder = async function (req, payload = {}) {
  const currentUser = req.session?.user || null;
  const currentUserId = normalizeUserId(currentUser?.id);

  if (!currentUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  const checkoutPayload = validateCheckoutPayload(payload);
  const activeCart = await cartService.getActiveCartRecord(req);

  if (!activeCart?.id || !Array.isArray(activeCart.items) || activeCart.items.length === 0) {
    throw createHttpError(400, 'CHECKOUT_CART_EMPTY', 'Gio hang dang trong.');
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await prisma.$transaction(async function (tx) {
        const cart = await tx.cart.findFirst({
          where: {
            id: activeCart.id,
            status: 'ACTIVE'
          },
          include: {
            items: {
              orderBy: {
                id: 'asc'
              },
              include: {
                book: {
                  select: {
                    title: true,
                    handle: true,
                    price: true
                  }
                }
              }
            }
          }
        });

        if (!cart?.id || !Array.isArray(cart.items) || cart.items.length === 0) {
          throw createHttpError(400, 'CHECKOUT_CART_EMPTY', 'Gio hang dang trong.');
        }

        const orderItems = buildOrderItemSnapshots(cart);
        const subtotalAmount = orderItems.reduce(function (sum, item) {
          return sum + item.lineTotal;
        }, 0);
        const totalAmount = subtotalAmount;
        const orderRecord = await tx.order.create({
          data: {
            orderNumber: buildOrderNumber(),
            userId: currentUserId,
            customerName: normalizeText(currentUser.name),
            customerEmail: normalizeText(currentUser.email),
            customerPhone: checkoutPayload.customerPhone,
            shippingAddress: checkoutPayload.shippingAddress,
            note: checkoutPayload.note,
            subtotalAmount,
            totalAmount
          },
          select: ORDER_SELECT
        });

        await tx.orderItem.createMany({
          data: orderItems.map(function (item) {
            return {
              orderId: orderRecord.id,
              bookId: item.bookId,
              bookTitle: item.bookTitle,
              bookHandle: item.bookHandle,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal
            };
          })
        });

        await cartService.markCartConverted(cart.id, tx);
        return orderRecord;
      });

      cartService.clearActiveCartPointer(req);
      return serializeCheckoutOrder(order);
    } catch (error) {
      if (error?.code === 'P2002' && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw createHttpError(500, 'ORDER_NUMBER_GENERATION_FAILED', 'Khong the tao ma don hang luc nay.');
};

const listOrdersForCurrentUser = async function (userId) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: normalizedUserId
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      items: {
        select: {
          quantity: true
        }
      }
    }
  });

  return orders.map(serializeOrderListItem);
};

const getOrderDetailForCurrentUser = async function (userId, orderId) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedOrderId = normalizeOrderId(orderId);

  if (!normalizedUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  if (!normalizedOrderId) {
    throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
  }

  const order = await prisma.order.findFirst({
    where: {
      id: normalizedOrderId,
      userId: normalizedUserId
    },
    include: ORDER_DETAIL_INCLUDE
  });

  if (!order) {
    throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
  }

  return serializeOrderDetail(order);
};

module.exports = {
  createCheckoutOrder,
  getOrderDetailForCurrentUser,
  listOrdersForCurrentUser
};
