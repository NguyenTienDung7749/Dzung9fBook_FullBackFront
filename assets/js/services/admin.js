import { isApiProviderMode } from '../config/runtime.js';
import { apiAdminProvider } from '../providers/admin/api.js';
import { staticAdminProvider } from '../providers/admin/static.js';

const getAdminProvider = function () {
  return isApiProviderMode() ? apiAdminProvider : staticAdminProvider;
};

export const getAdminOrders = function (status = '') {
  return getAdminProvider().getOrders(status);
};

export const updateAdminOrderStatus = function (id, payload) {
  return getAdminProvider().updateOrderStatus(id, payload);
};

export const getAdminMessages = function (status = '') {
  return getAdminProvider().getMessages(status);
};

export const updateAdminMessageStatus = function (id, payload) {
  return getAdminProvider().updateMessageStatus(id, payload);
};
