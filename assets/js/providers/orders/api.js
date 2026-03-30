import { postJson } from '../../api/client.js';

export const apiOrdersProvider = {
  async checkout(payload) {
    return postJson('/checkout', payload);
  }
};
