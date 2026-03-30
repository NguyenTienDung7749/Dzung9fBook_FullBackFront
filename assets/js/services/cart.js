import { isApiProviderMode } from '../config/runtime.js';
import { apiCartProvider } from '../providers/cart/api.js';
import { staticCartProvider } from '../providers/cart/static.js';
import { getBookByHandle, resolveLegacyBookId } from './catalog.js';
import { setCartState } from '../state/session-store.js';

const getCartProvider = function () {
  return isApiProviderMode() ? apiCartProvider : staticCartProvider;
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

const applyCartState = function (items) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(normalizeCartItem)
    .filter(Boolean);

  setCartState(normalizedItems);
  return normalizedItems;
};

export const getCart = async function () {
  return applyCartState(await getCartProvider().getCart());
};

export const syncCartSummary = function () {
  return getCart();
};

export const addItem = async function (bookId, handle = '') {
  return applyCartState(await getCartProvider().addItem({
    bookId: Number(bookId),
    handle: String(handle || '').trim(),
    quantity: 1
  }));
};

export const updateItemQuantity = async function (bookId, delta) {
  return applyCartState(await getCartProvider().updateItemQuantity(Number(bookId), Number(delta)));
};

export const removeItem = async function (bookId) {
  return applyCartState(await getCartProvider().removeItem(Number(bookId)));
};

export const getDetailedCart = async function () {
  const provider = getCartProvider();
  const cart = await getCart();
  let shouldPersistHandles = false;

  const resolvedCart = [];

  for (const item of cart) {
    let handle = String(item.handle || '').trim();

    if (!handle) {
      handle = await resolveLegacyBookId(item.bookId);

      if (handle) {
        shouldPersistHandles = true;
      }
    }

    resolvedCart.push({
      ...item,
      ...(handle ? { handle } : {})
    });
  }

  if (shouldPersistHandles && typeof provider.replaceCart === 'function') {
    applyCartState(await provider.replaceCart(resolvedCart));
  }

  const uniqueHandles = [...new Set(resolvedCart.map((item) => item.handle).filter(Boolean))];
  const detailEntries = await Promise.all(uniqueHandles.map(async (handle) => {
    try {
      const book = await getBookByHandle(handle);
      return [handle, book];
    } catch (error) {
      console.error(error);
      return [handle, null];
    }
  }));
  const bookByHandle = new Map(detailEntries.filter(([, book]) => book));

  return resolvedCart.map((item) => ({
    ...item,
    book: item.handle ? bookByHandle.get(item.handle) || null : null
  }));
};
