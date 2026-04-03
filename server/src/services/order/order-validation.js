const { createHttpError } = require('../../middleware/http-error');
const { normalizeEnumValue, normalizeText } = require('../../lib/normalize');

const ORDER_STATUS_VALUES = new Set(['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
const PAYMENT_STATUS_VALUES = new Set(['UNPAID', 'PAID', 'VOID']);
const CHECKOUT_PAYMENT_MODE_VALUES = new Set(['COD', 'ONLINE_DEMO']);

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
  const paymentMode = normalizeEnumValue(payload.paymentMode || 'COD');

  if (!customerPhone || !shippingAddress) {
    throw createHttpError(400, 'CHECKOUT_INVALID_PAYLOAD', 'Thong tin giao hang chua day du.');
  }

  if (!paymentMode || !CHECKOUT_PAYMENT_MODE_VALUES.has(paymentMode)) {
    throw createHttpError(400, 'CHECKOUT_INVALID_PAYLOAD', 'Phuong thuc thanh toan khong hop le.');
  }

  return {
    customerPhone,
    shippingAddress,
    note: note || null,
    paymentMode
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

module.exports = {
  buildCheckoutIssue,
  validateAdminOrderStatusPayload,
  validateCheckoutPayload,
  validateOrderStatusFilter
};
