const createUnsupportedCheckoutError = function () {
  const error = new Error('Checkout chi ho tro khi trang dang ket noi voi backend/API mode.');
  error.code = 'CHECKOUT_UNSUPPORTED';
  error.status = 501;
  return error;
};

const createUnsupportedOrdersError = function () {
  const error = new Error('Lich su don hang chi ho tro khi trang dang ket noi voi backend/API mode.');
  error.code = 'ORDERS_UNSUPPORTED';
  error.status = 501;
  return error;
};

const createUnsupportedOrderDetailError = function () {
  const error = new Error('Chi tiet don hang chi ho tro khi trang dang ket noi voi backend/API mode.');
  error.code = 'ORDER_DETAIL_UNSUPPORTED';
  error.status = 501;
  return error;
};

const createUnsupportedOrderCancelError = function () {
  const error = new Error('Huy don hang chi ho tro khi trang dang ket noi voi backend/API mode.');
  error.code = 'ORDER_CANCEL_UNSUPPORTED';
  error.status = 501;
  return error;
};

export const staticOrdersProvider = {
  async checkout() {
    throw createUnsupportedCheckoutError();
  },

  async getOrders() {
    throw createUnsupportedOrdersError();
  },

  async getOrderById() {
    throw createUnsupportedOrderDetailError();
  },

  async cancelOrder() {
    throw createUnsupportedOrderCancelError();
  }
};
