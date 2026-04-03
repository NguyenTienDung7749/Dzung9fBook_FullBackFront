const prisma = require('../lib/prisma');
const { createHttpError } = require('../middleware/http-error');
const { normalizeText } = require('../lib/normalize');
const cartService = require('./cart-service');
const {
  buildOrderNumber,
  canCancelCustomerOrder,
  normalizeAvailableQuantity,
  normalizeOrderId,
  normalizeQuantity,
  normalizeUserId
} = require('./order/order-support');
const {
  buildCheckoutIssue,
  validateAdminOrderStatusPayload,
  validateCheckoutPayload,
  validateOrderStatusFilter
} = require('./order/order-validation');
const {
  serializeAdminOrderListItem,
  serializeAdminOrderStatusUpdate,
  serializeCheckoutOrder,
  serializeOrderDetail,
  serializeOrderListItem
} = require('./order/order-serializers');

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
  const currentUser = req.currentUser || null;
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
            paymentMethod: 'COD',
            paymentStatus: checkoutPayload.paymentMode === 'ONLINE_DEMO' ? 'PAID' : 'UNPAID',
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
      paymentStatus: true,
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

const cancelOrderForCurrentUser = async function (userId, orderId) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedOrderId = normalizeOrderId(orderId);

  if (!normalizedUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  if (!normalizedOrderId) {
    throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
  }

  const cancelledOrder = await prisma.$transaction(async function (tx) {
    const currentOrder = await tx.order.findFirst({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId
      },
      include: ORDER_DETAIL_INCLUDE
    });

    if (!currentOrder) {
      throw createHttpError(404, 'ORDER_NOT_FOUND', 'Khong tim thay don hang.');
    }

    if (!canCancelCustomerOrder(currentOrder)) {
      throw createHttpError(409, 'ORDER_CANNOT_CANCEL', 'Don hang nay khong con o trang thai cho phep huy.');
    }

    const cancellationResult = await tx.order.updateMany({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId,
        status: 'PENDING_CONFIRMATION'
      },
      data: {
        status: 'CANCELLED'
      }
    });

    if (cancellationResult.count !== 1) {
      throw createHttpError(409, 'ORDER_CANNOT_CANCEL', 'Don hang nay khong con o trang thai cho phep huy.');
    }

    return tx.order.findUnique({
      where: {
        id: normalizedOrderId
      },
      include: ORDER_DETAIL_INCLUDE
    });
  });

  if (!cancelledOrder) {
    throw createHttpError(500, 'ORDER_CANCEL_FAILED', 'Khong the huy don hang luc nay.');
  }

  return serializeOrderDetail(cancelledOrder);
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
  cancelOrderForCurrentUser,
  createCheckoutOrder,
  getOrderDetailForCurrentUser,
  listAdminOrders,
  listOrdersForCurrentUser,
  updateAdminOrderStatus
};
