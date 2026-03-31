import { getJson, postJson } from '../../api/client.js';

const extractItems = function (payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
};

export const apiOrdersProvider = {
  async checkout(payload) {
    return postJson('/checkout', payload);
  },

  async getOrders() {
    return extractItems(await getJson('/orders'));
  }
};
