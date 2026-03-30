const STORAGE_KEYS = {
  cart: 'bookstore_cart',
  users: 'bookstore_users',
  currentUser: 'bookstore_current_user'
};

const readStorage = function (key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStorage = function (key, value) {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeCartItem = function (item) {
  const bookId = Number(item?.bookId);
  const quantity = Math.trunc(Number(item?.quantity));

  if (!Number.isFinite(bookId) || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const handle = String(item?.handle || '').trim();

  return {
    bookId,
    quantity,
    ...(handle ? { handle } : {})
  };
};

export const getUsers = function () {
  return readStorage(STORAGE_KEYS.users, []);
};

export const saveUsers = function (users) {
  writeStorage(STORAGE_KEYS.users, users);
};

export const getCurrentUser = function () {
  return readStorage(STORAGE_KEYS.currentUser, null);
};

export const setCurrentUser = function (user) {
  writeStorage(STORAGE_KEYS.currentUser, user);
};

export const clearCurrentUser = function () {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
};

export const getCart = function () {
  const cart = readStorage(STORAGE_KEYS.cart, []);

  return cart
    .map(normalizeCartItem)
    .filter(Boolean);
};

export const saveCart = function (cart) {
  writeStorage(STORAGE_KEYS.cart, cart
    .map(normalizeCartItem)
    .filter(Boolean));
};

export const addToCart = function (bookId, handle = '') {
  const cart = getCart();
  const normalizedBookId = Number(bookId);
  const normalizedHandle = String(handle || '').trim();
  const existingItem = cart.find((item) => item.bookId === normalizedBookId);

  if (existingItem) {
    existingItem.quantity += 1;

    if (normalizedHandle) {
      existingItem.handle = normalizedHandle;
    }
  } else {
    cart.push({
      bookId: normalizedBookId,
      quantity: 1,
      ...(normalizedHandle ? { handle: normalizedHandle } : {})
    });
  }

  saveCart(cart);
};

export const updateCartQuantity = function (bookId, delta) {
  const cart = getCart()
    .map((item) => {
      if (item.bookId === Number(bookId)) {
        return { ...item, quantity: item.quantity + delta };
      }

      return item;
    })
    .filter((item) => item.quantity > 0);

  saveCart(cart);
};

export const removeCartItem = function (bookId) {
  saveCart(getCart().filter((item) => item.bookId !== Number(bookId)));
};
