const { serializeTimestamp } = require('../../lib/normalize');
const { canCancelCustomerOrder } = require('./order-support');

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
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount || 0),
    createdAt: serializeTimestamp(order.createdAt),
    itemCount,
    canCancel: canCancelCustomerOrder(order)
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
    canCancel: canCancelCustomerOrder(order),
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

module.exports = {
  serializeAdminOrderListItem,
  serializeAdminOrderStatusUpdate,
  serializeCheckoutOrder,
  serializeOrderDetail,
  serializeOrderListItem
};
