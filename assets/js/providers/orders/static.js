const createUnsupportedCheckoutError = function () {
  const error = new Error('Checkout chi ho tro khi trang dang ket noi voi backend/API mode.');
  error.code = 'CHECKOUT_UNSUPPORTED';
  error.status = 501;
  return error;
};

export const staticOrdersProvider = {
  async checkout() {
    throw createUnsupportedCheckoutError();
  }
};
