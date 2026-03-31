import { isApiProviderMode } from '../config/runtime.js';
import { apiOrdersProvider } from '../providers/orders/api.js';
import { staticOrdersProvider } from '../providers/orders/static.js';

const getOrdersProvider = function () {
  return isApiProviderMode() ? apiOrdersProvider : staticOrdersProvider;
};

export const checkout = async function (payload) {
  return getOrdersProvider().checkout(payload);
};

export const getOrders = async function () {
  return getOrdersProvider().getOrders();
};
