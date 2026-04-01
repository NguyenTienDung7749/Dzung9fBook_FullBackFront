const createUnsupportedError = function () {
  const error = new Error('Khu vực admin chỉ hỗ trợ khi website đang chạy qua backend/API mode.');
  error.code = 'ADMIN_UNSUPPORTED';
  error.status = 501;
  return error;
};

export const staticAdminProvider = {
  async getMe() {
    throw createUnsupportedError();
  },

  async getBooks() {
    throw createUnsupportedError();
  },

  async updateBookInventory() {
    throw createUnsupportedError();
  },

  async getOrders() {
    throw createUnsupportedError();
  },

  async updateOrderStatus() {
    throw createUnsupportedError();
  },

  async getMessages() {
    throw createUnsupportedError();
  },

  async updateMessageStatus() {
    throw createUnsupportedError();
  }
};
