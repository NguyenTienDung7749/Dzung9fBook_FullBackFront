const crypto = require('node:crypto');
const { normalizeEnumValue, normalizeText } = require('../../lib/normalize');

const normalizeUserId = function (userId) {
  return normalizeText(userId);
};

const normalizeOrderId = function (orderId) {
  return normalizeText(orderId);
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

const canCancelCustomerOrder = function (order) {
  return normalizeEnumValue(order?.status) === 'PENDING_CONFIRMATION';
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

module.exports = {
  buildOrderNumber,
  canCancelCustomerOrder,
  normalizeAvailableQuantity,
  normalizeOrderId,
  normalizeQuantity,
  normalizeUserId
};
