import { isApiProviderMode } from '../config/runtime.js';
import { apiCatalogProvider } from '../providers/catalog/api.js';
import { staticCatalogProvider } from '../providers/catalog/static.js';

const getCatalogProvider = function () {
  return isApiProviderMode() ? apiCatalogProvider : staticCatalogProvider;
};

export const getCategories = function () {
  return getCatalogProvider().getCategories();
};

export const getCatalogIndex = function () {
  return getCatalogProvider().getCatalogIndex();
};

export const getBookByHandle = function (handle) {
  return getCatalogProvider().getBookByHandle(handle);
};

export const resolveLegacyBookId = function (id) {
  return getCatalogProvider().resolveLegacyBookId(id);
};

export const resolveBookFromSearch = async function (search = window.location.search) {
  const params = new URLSearchParams(search);
  const handle = params.get('handle') || '';

  if (handle) {
    return getBookByHandle(handle);
  }

  const id = params.get('id');

  if (!id) {
    return null;
  }

  const resolvedHandle = await resolveLegacyBookId(id);
  return resolvedHandle ? getBookByHandle(resolvedHandle) : null;
};

export const listBooks = function (filters) {
  return getCatalogProvider().listBooks(filters);
};
