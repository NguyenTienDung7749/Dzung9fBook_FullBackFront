import { deleteJson, getJson, patchJson, postJson } from '../../api/client.js';

const extractItems = function (payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
};

export const apiCartProvider = {
  async getCart() {
    return extractItems(await getJson('/cart'));
  },

  async addItem(payload) {
    return extractItems(await postJson('/cart/items', payload));
  },

  async updateItemQuantity(bookId, delta) {
    return extractItems(await patchJson(`/cart/items/${encodeURIComponent(String(bookId || '').trim())}`, { delta }));
  },

  async removeItem(bookId) {
    return extractItems(await deleteJson(`/cart/items/${encodeURIComponent(String(bookId || '').trim())}`));
  },

  async replaceCart(items) {
    return extractItems(await postJson('/cart/items', { items }));
  }
};
