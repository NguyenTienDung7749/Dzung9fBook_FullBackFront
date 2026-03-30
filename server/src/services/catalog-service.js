const fs = require('node:fs/promises');
const path = require('node:path');
const { createHttpError } = require('../middleware/http-error');

const PUBLIC_CATALOG_ROOT = path.resolve(process.cwd(), 'public', 'assets', 'data', 'catalog');
const FALLBACK_CATALOG_ROOT = path.resolve(process.cwd(), 'assets', 'data', 'catalog');
const BOOKS_PER_PAGE = 12;
const MAX_LIMIT = 5000;
const SORT_OPTIONS = new Set(['featured', 'title-asc', 'title-desc', 'price-asc', 'price-desc']);

let catalogRootPromise;
let categoriesPromise;
let catalogIndexPromise;
let lookupPromise;
const bookDetailPromiseCache = new Map();

const normalizeText = function (value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const pathExists = async function (targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    return false;
  }
};

const getCatalogRoot = async function () {
  if (!catalogRootPromise) {
    catalogRootPromise = (async function () {
      if (await pathExists(PUBLIC_CATALOG_ROOT)) {
        return PUBLIC_CATALOG_ROOT;
      }

      if (await pathExists(FALLBACK_CATALOG_ROOT)) {
        return FALLBACK_CATALOG_ROOT;
      }

      throw createHttpError(500, 'CATALOG_ROOT_MISSING', 'Khong tim thay du lieu catalog runtime.');
    }());
  }

  return catalogRootPromise;
};

const readCatalogJson = async function (...segments) {
  const catalogRoot = await getCatalogRoot();
  const filePath = path.join(catalogRoot, ...segments);

  try {
    const rawValue = await fs.readFile(filePath, 'utf8');
    return JSON.parse(rawValue);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw createHttpError(404, 'CATALOG_FILE_NOT_FOUND', `Khong tim thay file du lieu: ${segments.join('/')}`);
    }

    if (error instanceof SyntaxError) {
      throw createHttpError(500, 'CATALOG_JSON_INVALID', `File du lieu khong hop le: ${segments.join('/')}`);
    }

    throw error;
  }
};

const getSearchText = function (book) {
  return normalizeText([
    book.title,
    book.author,
    book.categoryLabel,
    book.subcategoryLabel
  ].filter(Boolean).join(' '));
};

const sortBooks = function (books, sort) {
  const items = [...books];

  if (sort === 'title-asc') {
    return items.sort((first, second) => String(first.title || '').localeCompare(String(second.title || ''), 'vi'));
  }

  if (sort === 'title-desc') {
    return items.sort((first, second) => String(second.title || '').localeCompare(String(first.title || ''), 'vi'));
  }

  if (sort === 'price-asc') {
    return items.sort((first, second) => Number(first.price || 0) - Number(second.price || 0));
  }

  if (sort === 'price-desc') {
    return items.sort((first, second) => Number(second.price || 0) - Number(first.price || 0));
  }

  return items;
};

const buildListState = function (filters = {}) {
  const page = Number.parseInt(filters.page || '1', 10);
  const requestedLimit = Number.parseInt(filters.limit || String(BOOKS_PER_PAGE), 10);
  const sort = String(filters.sort || 'featured').trim();

  return {
    category: String(filters.category || 'all').trim() || 'all',
    subcategory: String(filters.subcategory || '').trim(),
    query: String(filters.q || '').trim(),
    sort: SORT_OPTIONS.has(sort) ? sort : 'featured',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : BOOKS_PER_PAGE))
  };
};

const filterBooks = function (books, state) {
  const normalizedQuery = normalizeText(state.query);

  return books.filter((book) => {
    const matchesCategory = state.category === 'all' || String(book.parentSlug || '').trim() === state.category;
    const matchesSubcategory = !state.subcategory || String(book.subcategorySlug || '').trim() === state.subcategory;
    const matchesQuery = !normalizedQuery || getSearchText(book).includes(normalizedQuery);

    return matchesCategory && matchesSubcategory && matchesQuery;
  });
};

const getCategories = async function () {
  if (!categoriesPromise) {
    categoriesPromise = readCatalogJson('categories.json');
  }

  return categoriesPromise;
};

const getCatalogIndex = async function () {
  if (!catalogIndexPromise) {
    catalogIndexPromise = readCatalogJson('catalog-index.json');
  }

  return catalogIndexPromise;
};

const getCatalogLookup = async function () {
  if (!lookupPromise) {
    lookupPromise = readCatalogJson('lookup.json');
  }

  return lookupPromise;
};

const getBookByHandle = async function (handle) {
  const normalizedHandle = String(handle || '').trim();

  if (!normalizedHandle) {
    return null;
  }

  if (!bookDetailPromiseCache.has(normalizedHandle)) {
    bookDetailPromiseCache.set(normalizedHandle, readCatalogJson('books', `${normalizedHandle}.json`).catch((error) => {
      if (error?.status === 404) {
        return null;
      }

      throw error;
    }));
  }

  return bookDetailPromiseCache.get(normalizedHandle);
};

const resolveLegacyBookId = async function (id) {
  const lookup = await getCatalogLookup();
  const match = (Array.isArray(lookup) ? lookup : []).find((item) => Number(item?.id) === Number(id));
  return String(match?.handle || '').trim();
};

const listBooks = async function (filters = {}) {
  const catalogIndex = await getCatalogIndex();
  const books = Array.isArray(catalogIndex) ? catalogIndex : [];
  const state = buildListState(filters);
  const filteredBooks = filterBooks(books, state);
  const sortedBooks = sortBooks(filteredBooks, state.sort);
  const totalItems = sortedBooks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.limit));
  const page = Math.min(state.page, totalPages);
  const startIndex = (page - 1) * state.limit;

  return {
    items: sortedBooks.slice(startIndex, startIndex + state.limit),
    totalItems,
    totalPages,
    page,
    limit: state.limit
  };
};

module.exports = {
  getCategories,
  getCatalogIndex,
  getCatalogLookup,
  getBookByHandle,
  listBooks,
  resolveLegacyBookId
};
