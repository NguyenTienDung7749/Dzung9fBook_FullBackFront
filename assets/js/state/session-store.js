const listeners = new Set();

let state = {
  authStatus: 'idle',
  currentUser: null,
  cartCount: 0,
  cartItems: []
};

const notify = function () {
  listeners.forEach((listener) => {
    listener(state);
  });
};

export const getSessionSnapshot = function () {
  return state;
};

export const subscribeSessionStore = function (listener) {
  listeners.add(listener);
  listener(state);

  return function () {
    listeners.delete(listener);
  };
};

export const patchSessionState = function (patch) {
  state = {
    ...state,
    ...patch
  };
  notify();
};

export const setSessionUser = function (user) {
  patchSessionState({
    authStatus: user ? 'authenticated' : 'anonymous',
    currentUser: user || null
  });
};

export const setSessionLoading = function () {
  patchSessionState({
    authStatus: 'loading'
  });
};

export const setCartState = function (items) {
  const nextItems = Array.isArray(items) ? items : [];
  const cartCount = nextItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  patchSessionState({
    cartItems: nextItems,
    cartCount
  });
};
