import { getJson } from '../../api/client.js';
import { normalizeCategories, normalizeCatalogBook } from '../../data/catalog.js';

const INDEX_LIMIT = 5000;

let categoriesPromise;
let catalogIndexPromise;

export const apiCatalogProvider = {
  async getCategories() {
    if (!categoriesPromise) {
      categoriesPromise = getJson('/catalog/categories').then(normalizeCategories);
    }

    return categoriesPromise;
  },

  async getCatalogIndex() {
    if (!catalogIndexPromise) {
      catalogIndexPromise = getJson(`/catalog/books?limit=${INDEX_LIMIT}&page=1`).then((payload) => {
        return (Array.isArray(payload?.items) ? payload.items : []).map(normalizeCatalogBook);
      });
    }

    return catalogIndexPromise;
  },

  async getBookByHandle(handle) {
    const payload = await getJson(`/catalog/books/${encodeURIComponent(String(handle || '').trim())}`);
    return payload ? normalizeCatalogBook(payload) : null;
  },

  async resolveLegacyBookId(id) {
    const payload = await getJson(`/catalog/books/resolve?id=${encodeURIComponent(String(id || '').trim())}`);
    return String(payload?.handle || '').trim();
  },

  async listBooks(filters = {}) {
    const params = new URLSearchParams();
    const entries = {
      category: filters.category,
      subcategory: filters.subcategory,
      q: filters.q,
      sort: filters.sort,
      page: filters.page,
      limit: filters.limit
    };

    Object.entries(entries).forEach(([key, value]) => {
      const normalizedValue = String(value || '').trim();

      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    });

    const payload = await getJson(`/catalog/books${params.toString() ? `?${params.toString()}` : ''}`);

    return {
      items: (Array.isArray(payload?.items) ? payload.items : []).map(normalizeCatalogBook),
      totalItems: Number(payload?.totalItems || 0),
      totalPages: Number(payload?.totalPages || 1),
      page: Number(payload?.page || 1),
      limit: Number(payload?.limit || filters.limit || 12)
    };
  }
};
