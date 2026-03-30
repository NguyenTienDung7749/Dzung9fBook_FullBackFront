import { getJson, postJson } from '../../api/client.js';

export const apiAuthProvider = {
  async getSession() {
    return getJson('/auth/me');
  },

  async login(credentials) {
    return postJson('/auth/login', credentials);
  },

  async register(payload) {
    return postJson('/auth/register', payload);
  },

  async logout() {
    return postJson('/auth/logout', {});
  }
};
