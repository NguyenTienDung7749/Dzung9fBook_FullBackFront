import { qs } from '../core/dom.js';
import {
  buildBooksUrl,
  getBooksStateFromUrl,
  updateBooksUrl,
  BOOKS_PER_PAGE,
  getPaginationWindow,
  getCategorySummaryLabel
} from '../data/catalog.js';
import { getCatalogIndex, listBooks } from '../services/catalog.js';
import { buildBookCard, buildBooksSummary, initCategoryAccordions, initCategoryBrowsers, renderBooksCategoryNav } from '../ui/catalog-ui.js';
import { renderMobileCategoryNavs, syncSearchInputs } from '../ui/shell.js';

const renderCatalogState = function (container, title, description, actionsMarkup = '') {
  container.classList.remove('books-grid--collection');
  container.innerHTML = `
    <div class="empty-state empty-state--catalog">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionsMarkup ? `<div class="empty-state__actions">${actionsMarkup}</div>` : ''}
    </div>
  `;
};

const renderBooksPagination = function (categories, state, totalItems) {
  const pagination = qs('[data-books-pagination]');

  if (!pagination) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / BOOKS_PER_PAGE));

  if (totalItems <= BOOKS_PER_PAGE) {
    pagination.hidden = true;
    pagination.innerHTML = '';
    return;
  }

  const pages = getPaginationWindow(totalPages, state.page);

  pagination.innerHTML = `
    <a class="catalog-pagination__nav ${state.page === 1 ? 'is-disabled' : ''}" href="${buildBooksUrl(categories, { ...state, page: Math.max(1, state.page - 1) })}" ${state.page === 1 ? 'aria-disabled="true" tabindex="-1"' : ''}>
      Trước
    </a>
    <div class="catalog-pagination__pages">
      ${pages.map((item) => {
        if (typeof item !== 'number') {
          return '<span class="catalog-pagination__ellipsis">...</span>';
        }

        return `
          <a class="catalog-pagination__page ${item === state.page ? 'is-current' : ''}" href="${buildBooksUrl(categories, { ...state, page: item })}" ${item === state.page ? 'aria-current="page"' : ''}>
            ${item}
          </a>
        `;
      }).join('')}
    </div>
    <a class="catalog-pagination__nav ${state.page === totalPages ? 'is-disabled' : ''}" href="${buildBooksUrl(categories, { ...state, page: Math.min(totalPages, state.page + 1) })}" ${state.page === totalPages ? 'aria-disabled="true" tabindex="-1"' : ''}>
      Sau
    </a>
  `;

  pagination.hidden = false;
};

let categoriesCache = [];
let booksCache = [];
let renderSequence = 0;

const renderBooks = async function () {
  const container = qs('[data-books-list]');

  if (!container) {
    return;
  }

  const renderId = renderSequence + 1;
  renderSequence = renderId;

  const state = getBooksStateFromUrl(categoriesCache);
  const searchInput = qs('[data-books-search]');
  const sortSelect = qs('[data-books-sort]');
  const summary = qs('[data-books-summary]');
  const heading = qs('[data-books-heading]');
  const description = qs('[data-books-heading-description]');

  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = state.query;
  }

  if (sortSelect) {
    sortSelect.value = state.sort;
  }

  if (heading) {
    heading.textContent = getCategorySummaryLabel(categoriesCache, state);
  }

  if (state.changed) {
    updateBooksUrl(categoriesCache, state);
    syncSearchInputs();
  }

  renderMobileCategoryNavs(categoriesCache, { state, preserveQuery: true });
  renderBooksCategoryNav(categoriesCache, state);
  initCategoryBrowsers();
  initCategoryAccordions();

  renderCatalogState(
    container,
    'Đang tải danh sách sách',
    'Chúng mình đang cập nhật những tựa sách mới nhất cho bộ lọc hiện tại.'
  );

  let payload;

  try {
    payload = await listBooks({
      category: state.category,
      subcategory: state.subcategory,
      q: state.query,
      sort: state.sort,
      page: state.page,
      limit: BOOKS_PER_PAGE
    });
  } catch (error) {
    if (renderId !== renderSequence) {
      return;
    }

    if (summary) {
      summary.hidden = true;
    }

    if (description) {
      description.hidden = false;
      description.textContent = 'Bạn có thể giữ bộ lọc hiện tại để thử lại hoặc quay về toàn bộ danh mục.';
    }

    renderCatalogState(
      container,
      'Không thể tải danh sách sách',
      'Dữ liệu sách đang tạm thời chưa phản hồi. Vui lòng thử tải lại hoặc quay về toàn bộ danh mục.',
      `
        <a href="${buildBooksUrl(categoriesCache, state)}" class="btn btn-primary">Thử tải lại</a>
        <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">Xem tất cả sách</a>
      `
    );
    renderBooksPagination(categoriesCache, state, 0);
    console.error(error);
    return;
  }

  if (renderId !== renderSequence) {
    return;
  }

  const currentPage = Math.max(1, Number(payload?.page || 1));
  const totalItems = Math.max(0, Number(payload?.totalItems || 0));
  const visibleBooks = Array.isArray(payload?.items) ? payload.items : [];

  if (currentPage !== state.page) {
    state.page = currentPage;
    state.changed = true;
  }

  if (state.changed) {
    updateBooksUrl(categoriesCache, state);
    syncSearchInputs();
  }

  if (summary) {
    summary.hidden = false;
    summary.textContent = buildBooksSummary(categoriesCache, booksCache, state, totalItems);
  }

  if (heading) {
    heading.textContent = getCategorySummaryLabel(categoriesCache, state);
  }

  if (description) {
    description.hidden = false;
    description.textContent = state.category === 'all'
      ? 'Khám phá nhanh theo cách một collection page bán sách nên có: rõ nhánh, gọn thao tác và dễ lướt nhiều bìa cùng lúc.'
      : 'Danh sách được lọc theo nhóm chủ đề hiện tại, bạn có thể tiếp tục thu hẹp bằng nhánh nhỏ hoặc từ khóa.';
  }

  if (!totalItems) {
    renderCatalogState(
      container,
      'Chưa có đầu sách phù hợp',
      'Danh mục này hiện chưa có cuốn sách nào khớp với lựa chọn của bạn. Hãy thử quay về toàn bộ tủ sách hoặc đổi từ khóa tìm kiếm.',
      `
        <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-primary">Xem tất cả sách</a>
        ${state.category !== 'all' ? `<a href="${buildBooksUrl(categoriesCache, { category: state.category, q: state.query })}" class="btn btn-secondary">Bỏ lọc nhánh nhỏ</a>` : ''}
      `
    );
    renderBooksPagination(categoriesCache, state, 0);
    return;
  }

  container.classList.toggle('books-grid--collection', visibleBooks.every((book) => book.listingStyle === 'collection'));
  container.innerHTML = visibleBooks.map((book) => buildBookCard(categoriesCache, book, state)).join('');
  renderBooksPagination(categoriesCache, state, totalItems);
};

const initBooksSearch = function () {
  const searchInput = qs('[data-books-search]');

  if (!searchInput) {
    return;
  }

  let isSearchComposing = false;
  const applySearch = function (rawQuery) {
    const currentState = getBooksStateFromUrl(categoriesCache);

    if (rawQuery === currentState.query && currentState.page === 1) {
      return;
    }

    updateBooksUrl(categoriesCache, {
      category: currentState.category,
      subcategory: currentState.subcategory,
      q: rawQuery,
      sort: currentState.sort,
      page: 1
    });
    void renderBooks();
  };

  searchInput.addEventListener('compositionstart', function () {
    isSearchComposing = true;
  });

  searchInput.addEventListener('compositionend', function () {
    isSearchComposing = false;
    applySearch(searchInput.value);
  });

  searchInput.addEventListener('input', function (event) {
    if (isSearchComposing || event.isComposing) {
      return;
    }

    applySearch(searchInput.value);
  });
};

const initBooksSort = function () {
  const sortSelect = qs('[data-books-sort]');

  if (!sortSelect) {
    return;
  }

  sortSelect.addEventListener('change', function () {
    const currentState = getBooksStateFromUrl(categoriesCache);
    updateBooksUrl(categoriesCache, {
      category: currentState.category,
      subcategory: currentState.subcategory,
      q: currentState.query,
      sort: sortSelect.value,
      page: 1
    });
    void renderBooks();
  });
};

export const initBooksPage = async function (categories) {
  const container = qs('[data-books-list]');

  if (!container) {
    return;
  }

  categoriesCache = categories;
  try {
    booksCache = await getCatalogIndex();
  } catch (error) {
    booksCache = [];
    console.error(error);
  }

  await renderBooks();
  initBooksSearch();
  initBooksSort();
  window.addEventListener('popstate', function () {
    void renderBooks();
  });
};
