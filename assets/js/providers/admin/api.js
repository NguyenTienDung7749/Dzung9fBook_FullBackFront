import { getJson, patchJson } from '../../api/client.js';

const extractItems = function (payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
};

const buildFilteredPath = function (basePath, status) {
  const normalizedStatus = String(status || '').trim();

  if (!normalizedStatus) {
    return basePath;
  }

  return `${basePath}?status=${encodeURIComponent(normalizedStatus)}`;
};

export const apiAdminProvider = {
  async getOrders(status = '') {
    return extractItems(await getJson(buildFilteredPath('/admin/orders', status)));
  },

  async updateOrderStatus(id, payload) {
    const normalizedId = encodeURIComponent(String(id || '').trim());
    const response = await patchJson(`/admin/orders/${normalizedId}/status`, payload);
    return response?.order || null;
  },

  async getMessages(status = '') {
    return extractItems(await getJson(buildFilteredPath('/admin/messages', status)));
  },

  async updateMessageStatus(id, payload) {
    const normalizedId = encodeURIComponent(String(id || '').trim());
    const response = await patchJson(`/admin/messages/${normalizedId}/status`, payload);
    return response?.message || null;
  }
};
