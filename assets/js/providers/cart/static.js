import { addToCart, getCart, removeCartItem, saveCart, updateCartQuantity } from '../../core/storage.js';

export const staticCartProvider = {
  async getCart() {
    return getCart();
  },

  async addItem(payload) {
    addToCart(payload?.bookId, payload?.handle || '');
    return getCart();
  },

  async updateItemQuantity(bookId, delta) {
    updateCartQuantity(bookId, delta);
    return getCart();
  },

  async removeItem(bookId) {
    removeCartItem(bookId);
    return getCart();
  },

  async replaceCart(items) {
    saveCart(items);
    return getCart();
  }
};
