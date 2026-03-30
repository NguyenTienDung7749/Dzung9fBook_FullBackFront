import { BOOKS_PER_PAGE, filterBooks, normalizeCategories, normalizeCatalogBook, normalizeCatalogLookup, sortBooks } from '../../data/catalog.js';

const CATALOG_BASE = './assets/data/catalog';
const INDEX_LIMIT = 5000;

let categoriesPromise;
let catalogIndexPromise;
let detailLookupPromise;
const detailPromiseCache = new Map();

const loadJson = async function (relativePath) {
  const response = await fetch(relativePath, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Không thể tải ${relativePath}: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const buildCatalogState = function (filters = {}) {
  return {
    category: String(filters.category || 'all').trim() || 'all',
    subcategory: String(filters.subcategory || '').trim(),
    query: String(filters.q || '').trim(),
    sort: String(filters.sort || 'featured').trim() || 'featured',
    page: Math.max(1, Number.parseInt(filters.page || '1', 10) || 1),
    changed: false
  };
};

export const staticCatalogProvider = {
  async getCategories() {
    if (!categoriesPromise) {
      categoriesPromise = loadJson(`${CATALOG_BASE}/categories.json`).then(normalizeCategories);
    }

    return categoriesPromise;
  },

  async getCatalogIndex() {
    if (!catalogIndexPromise) {
      catalogIndexPromise = loadJson(`${CATALOG_BASE}/catalog-index.json`).then((books) => {
        return (Array.isArray(books) ? books : []).map(normalizeCatalogBook);
      });
    }

    return catalogIndexPromise;
  },

  async getBookByHandle(handle) {
    const normalizedHandle = String(handle || '').trim();

    if (!normalizedHandle) {
      return null;
    }

    if (!detailPromiseCache.has(normalizedHandle)) {
      detailPromiseCache.set(normalizedHandle, loadJson(`${CATALOG_BASE}/books/${normalizedHandle}.json`).then(normalizeCatalogBook));
    }

    return detailPromiseCache.get(normalizedHandle);
  },

  async getCatalogLookup() {
    if (!detailLookupPromise) {
      detailLookupPromise = loadJson(`${CATALOG_BASE}/lookup.json`).then(normalizeCatalogLookup);
    }

    return detailLookupPromise;
  },

  async resolveLegacyBookId(id) {
    const lookup = await this.getCatalogLookup();
    const match = lookup.find((item) => Number(item.id) === Number(id));
    return match ? match.handle : '';
  },

  async listBooks(filters = {}) {
    const categories = await this.getCategories();
    const books = await this.getCatalogIndex();
    const state = buildCatalogState(filters);
    const limit = Math.max(1, Number.parseInt(filters.limit || String(BOOKS_PER_PAGE), 10) || BOOKS_PER_PAGE);
    const filteredBooks = filterBooks(categories, books, state);
    const sortedBooks = sortBooks(filteredBooks, state.sort);
    const totalItems = sortedBooks.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const page = Math.min(state.page, totalPages);
    const startIndex = (page - 1) * limit;

    return {
      items: sortedBooks.slice(startIndex, startIndex + limit),
      totalItems,
      totalPages,
      page,
      limit: Math.min(limit, INDEX_LIMIT)
    };
  }
};
