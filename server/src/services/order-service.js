const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');
const cartService = require('./cart-service');

const prisma = new PrismaClient();
const ORDER_STATUS_VALUES = new Set(['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
const PAYMENT_STATUS_VALUES = new Set(['UNPAID', 'PAID', 'VOID']);
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
const CHECKOUT_BOOK_SELECT = {
  title: true,
  handle: true,
  price: true,
  isActive: true,
  isSoldOut: true,
  trackInventory: true,
  stockQuantity: true,
  allowBackorder: true
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

const normalizeEnumValue = function (value) {
  return String(value || '').trim().toUpperCase();
};

const normalizeQuantity = function (value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.trunc(parsedValue);
};

const normalizeAvailableQuantity = function (value) {
  const parsedValue = normalizeQuantity(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
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

const serializeAdminOrderListItem = function (order) {
  const itemCount = (Array.isArray(order.items) ? order.items : []).reduce(function (sum, item) {
    return sum + Number(item?.quantity || 0);
  }, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount || 0),
    createdAt: serializeTimestamp(order.createdAt),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    itemCount
  };
};

const serializeAdminOrderStatusUpdate = function (order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    updatedAt: serializeTimestamp(order.updatedAt)
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

const validateOrderStatusFilter = function (value) {
  const normalizedStatus = normalizeEnumValue(value);

  if (!normalizedStatus) {
    return null;
  }

  if (!ORDER_STATUS_VALUES.has(normalizedStatus)) {
    throw createHttpError(400, 'ADMIN_ORDER_INVALID_FILTER', 'Bo loc trang thai don hang khong hop le.');
  }

  return normalizedStatus;
};

const validateAdminOrderStatusPayload = function (payload = {}) {
  const status = normalizeEnumValue(payload.status);
  const paymentStatusProvided = payload.paymentStatus !== undefined;
  const paymentStatus = normalizeEnumValue(payload.paymentStatus);

  if (!status || !ORDER_STATUS_VALUES.has(status)) {
    throw createHttpError(400, 'ADMIN_ORDER_INVALID_PAYLOAD', 'Trang thai don hang khong hop le.');
  }

  if (paymentStatusProvided && (!paymentStatus || !PAYMENT_STATUS_VALUES.has(paymentStatus))) {
    throw createHttpError(400, 'ADMIN_ORDER_INVALID_PAYLOAD', 'Trang thai thanh toan khong hop le.');
  }

  return {
    status,
    ...(paymentStatusProvided ? { paymentStatus } : {})
  };
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

const buildCheckoutIssue = function (item, reason, availableQuantity = null) {
  const book = item?.book || null;

  return {
    bookId: Number(item?.bookId || 0),
    bookHandle: String(book?.handle || '').trim() || null,
    bookTitle: String(book?.title || '').trim() || 'Tựa sách không còn khả dụng',
    requestedQuantity: Math.max(0, Number(item?.quantity || 0)),
    availableQuantity: Number.isFinite(Number(availableQuantity))
      ? Number(availableQuantity)
      : null,
    reason
  };
};

const buildOrderItemSnapshots = function (cart) {
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  if (!cartItems.length) {
    throw createHttpError(400, 'CHECKOUT_CART_EMPTY', 'Gio hang dang trong.');
  }

  const issues = [];
  const orderItems = [];

  cartItems.forEach(function (item) {
    const book = item?.book;
    const unitPrice = Number(book?.price);
    const quantity = normalizeQuantity(item?.quantity);
    const availableQuantity = normalizeAvailableQuantity(book?.stockQuantity);

    if (
      !book
      || !book.title
      || !book.handle
      || book.isActive === false
      || !Number.isFinite(unitPrice)
      || !Number.isFinite(quantity)
      || quantity <= 0
    ) {
      issues.push(buildCheckoutIssue(item, 'UNAVAILABLE'));
      return;
    }

    if (book.isSoldOut) {
      issues.push(buildCheckoutIssue(item, 'SOLD_OUT', 0));
      return;
    }

    if (book.trackInventory && !book.allowBackorder) {
      if (availableQuantity === null) {
        issues.push(buildCheckoutIssue(item, 'UNAVAILABLE'));
        return;
      }

      if (quantity > availableQuantity) {
        issues.push(buildCheckoutIssue(item, 'INSUFFICIENT_STOCK', availableQuantity));
        return;
      }
    }

    orderItems.push({
      bookId: item.bookId,
      bookTitle: book.title,
      bookHandle: book.handle,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity
    });
  });

  if (issues.length > 0) {
    throw createHttpError(
      409,
      'CHECKOUT_INVENTORY_CONFLICT',
      'Một vài sách trong giỏ đã thay đổi tình trạng tồn kho. Vui lòng kiểm tra và cập nhật lại giỏ hàng.',
      {
        issues
      }
    );
  }

  return orderItems;
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
                  select: CHECKOUT_BOOK_SELECT
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

const listAdminOrders = async function (query = {}) {
  const status = validateOrderStatusFilter(query.status);
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      createdAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      items: {
        select: {
          quantity: true
        }
      }
    }
  });

  return orders.map(serializeAdminOrderListItem);
};

const updateAdminOrderStatus = async function (orderId, payload = {}) {
  const normalizedOrderId = normalizeOrderId(orderId);

  if (!normalizedOrderId) {
    throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
  }

  const validatedPayload = validateAdminOrderStatusPayload(payload);

  try {
    const order = await prisma.order.update({
      where: {
        id: normalizedOrderId
      },
      data: validatedPayload,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        updatedAt: true
      }
    });

    return serializeAdminOrderStatusUpdate(order);
  } catch (error) {
    if (error?.code === 'P2025') {
      throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
    }

    throw error;
  }
};

module.exports = {
  createCheckoutOrder,
  getOrderDetailForCurrentUser,
  listAdminOrders,
  listOrdersForCurrentUser,
  updateAdminOrderStatus
};
