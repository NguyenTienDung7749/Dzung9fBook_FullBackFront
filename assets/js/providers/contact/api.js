import { postJson } from '../../api/client.js';

export const apiContactProvider = {
  async submit(payload) {
    return postJson('/contact', payload);
  }
};
