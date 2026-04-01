import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminBooks, updateAdminBookInventory } from '../services/admin.js';

const FILTER_VALUES = new Set(['in-stock', 'sold-out']);

let state = {
  status: 'idle',
  filter: '',
  searchTerm: '',
  items: [],
  pendingBookId: '',
  feedbackById: {},
  draftById: {}
};

const getContent = function () {
  return qs('[data-admin-books-content]');
};

const getFilter = function () {
  return qs('[data-admin-books-filter]');
};

const getSearchInput = function () {
  return qs('[data-admin-books-search]');
};

const normalizeSearchText = function (value) {
  return String(value || '').trim().toLowerCase();
};

const formatDateTime = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Không rõ thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const buildStateMarkup = function (title, description, actionMarkup = '') {
  return `
    <div class="empty-state">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionMarkup ? `<div class="empty-state__actions">${actionMarkup}</div>` : ''}
    </div>
  `;
};

const buildFeedbackMarkup = function (feedback) {
  if (!feedback?.message) {
    return '<div class="form-message"></div>';
  }

  return `
    <div class="form-message is-visible ${feedback.type === 'success' ? 'is-success' : 'is-error'}">
      ${escapeHTML(feedback.message)}
    </div>
  `;
};

const buildDraftFromBook = function (book) {
  return {
    isSoldOut: Boolean(book?.isSoldOut)
  };
};

const getDraftForBook = function (book) {
  const key = String(book?.id || '').trim();
  return state.draftById[key] || buildDraftFromBook(book);
};

const buildInventorySummary = function (draft) {
  return draft.isSoldOut
    ? 'Hết hàng / tồn kho 0 / track inventory bật'
    : 'Còn hàng / tồn kho 500 / track inventory bật';
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);

  return (Array.isArray(state.items) ? state.items : []).filter(function (book) {
    const draft = getDraftForBook(book);

    if (state.filter === 'sold-out' && !draft.isSoldOut) {
      return false;
    }

    if (state.filter === 'in-stock' && draft.isSoldOut) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    return [
      book.title,
      book.author,
      book.handle,
      book.sku,
      book.categoryLabel,
      book.subcategoryLabel
    ].some(function (value) {
      return normalizeSearchText(value).includes(searchTerm);
    });
  });
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(String(state.filter || '').trim()) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Đang hiển thị ${visibleCount} / ${totalCount} tựa sách phù hợp với bộ lọc hiện tại.`
    : `Đang hiển thị ${visibleCount} tựa sách với simple inventory 500/0.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildBookCardMarkup = function (book) {
  const bookId = String(book?.id || '').trim();
  const draft = getDraftForBook(book);
  const isPending = state.pendingBookId === bookId;
  const feedback = state.feedbackById[bookId] || null;

  return `
    <article class="profile-card admin-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(draft.isSoldOut ? 'Hết hàng' : 'Còn hàng')}</p>
        <h2 class="profile-card__title">${escapeHTML(book.title || 'Tựa sách')}</h2>
        <p class="profile-card__text">${escapeHTML(buildInventorySummary(draft))}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>Tác giả</dt>
          <dd>${escapeHTML(book.author || 'Đang cập nhật')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Handle</dt>
          <dd>${escapeHTML(book.handle || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>SKU</dt>
          <dd>${escapeHTML(book.sku || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Giá bán</dt>
          <dd>${escapeHTML(formatPrice(book.price || 0))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Danh mục</dt>
          <dd>${escapeHTML([book.categoryLabel, book.subcategoryLabel].filter(Boolean).join(' / ') || 'Chưa gán')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Cập nhật</dt>
          <dd>${escapeHTML(formatDateTime(book.updatedAt))}</dd>
        </div>
      </dl>

      <form class="admin-status-form" data-admin-book-form data-book-id="${escapeHTML(bookId)}">
        <div class="admin-checklist">
          <label class="admin-check">
            <input type="checkbox" name="isSoldOut" ${draft.isSoldOut ? 'checked' : ''} ${isPending ? 'disabled' : ''}>
            <span>Đánh dấu hết hàng</span>
          </label>
          <p class="admin-simple-rule">
            Rule cố định: hết hàng = stock 0, còn hàng = stock 500, track inventory bật, backorder tắt.
          </p>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu trạng thái'}
        </button>
      </form>
    </article>
  `;
};

const render = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  if (!isApiProviderMode()) {
    container.innerHTML = buildStateMarkup(
      'Admin inventory chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để tải và cập nhật dữ liệu tồn kho thực tế trong DB.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách sách',
      'Chúng mình đang đồng bộ catalog từ backend để staff/admin cập nhật tồn kho.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản staff/admin để truy cập khu vực quản lý tồn kho.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm staff/admin nên không thể dùng trang inventory này.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải dữ liệu tồn kho',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin-books.html" class="btn btn-primary">Thử tải lại</a>'
    );
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chưa có tựa sách nào trong DB',
      'Danh sách sách hiện đang trống, vì vậy chưa có dữ liệu tồn kho để cập nhật.'
    );
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'Không có kết quả phù hợp',
      'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem nhiều tựa sách hơn.'
    );
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    <div class="admin-list">
      ${visibleItems.map(buildBookCardMarkup).join('')}
    </div>
  `;
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingBookId: '',
      feedbackById: {},
      draftById: {}
    };
    render();
    return true;
  }

  if (error?.status === 403) {
    state = {
      ...state,
      status: 'forbidden',
      items: [],
      pendingBookId: '',
      feedbackById: {},
      draftById: {}
    };
    render();
    return true;
  }

  return false;
};

const loadBooks = async function () {
  state = {
    ...state,
    status: 'loading',
    items: [],
    pendingBookId: '',
    feedbackById: {},
    draftById: {}
  };
  render();

  try {
    const items = await getAdminBooks();
    state = {
      ...state,
      status: 'ready',
      items: Array.isArray(items) ? items : [],
      pendingBookId: '',
      feedbackById: {},
      draftById: {}
    };
  } catch (error) {
    if (setPageStateFromError(error)) {
      return;
    }

    state = {
      ...state,
      status: 'error',
      items: [],
      pendingBookId: '',
      feedbackById: {},
      draftById: {}
    };
    console.error(error);
  }

  render();
};

const updateBookInState = function (bookId, updatedBook) {
  state = {
    ...state,
    items: state.items.map(function (item) {
      return String(item.id) === String(bookId) ? { ...item, ...(updatedBook || {}) } : item;
    })
  };
};

const setDraftForBook = function (bookId, draft) {
  state = {
    ...state,
    draftById: {
      ...state.draftById,
      [bookId]: draft
    }
  };
};

const clearDraftForBook = function (bookId) {
  const nextDraftById = { ...state.draftById };
  delete nextDraftById[bookId];
  state = {
    ...state,
    draftById: nextDraftById
  };
};

const buildInventoryPayload = function (form) {
  return {
    isSoldOut: Boolean(form.elements.isSoldOut?.checked)
  };
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    const nextFilter = String(filter.value || '').trim();

    state = {
      ...state,
      filter: FILTER_VALUES.has(nextFilter) ? nextFilter : ''
    };
    render();
  });
};

const bindSearch = function () {
  const searchInput = getSearchInput();

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener('input', function () {
    state = {
      ...state,
      searchTerm: String(searchInput.value || '').trim()
    };
    render();
  });
};

const bindActions = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  container.addEventListener('change', function (event) {
    const form = event.target.closest('[data-admin-book-form]');

    if (!form) {
      return;
    }

    const bookId = String(form.dataset.bookId || '').trim();
    setDraftForBook(bookId, {
      isSoldOut: Boolean(form.elements.isSoldOut?.checked)
    });
  });

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-book-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const bookId = String(form.dataset.bookId || '').trim();

    if (!bookId || state.pendingBookId) {
      return;
    }

    const payload = buildInventoryPayload(form);
    setDraftForBook(bookId, payload);
    state = {
      ...state,
      pendingBookId: bookId,
      feedbackById: {
        ...state.feedbackById,
        [bookId]: null
      }
    };
    render();

    void updateAdminBookInventory(bookId, payload).then(function (updatedBook) {
      updateBookInState(bookId, updatedBook || {});
      clearDraftForBook(bookId);
      state = {
        ...state,
        pendingBookId: '',
        feedbackById: {
          ...state.feedbackById,
          [bookId]: {
            type: 'success',
            message: 'Đã cập nhật trạng thái tồn kho.'
          }
        }
      };
      render();
    }).catch(function (error) {
      if (setPageStateFromError(error)) {
        return;
      }

      state = {
        ...state,
        pendingBookId: '',
        feedbackById: {
          ...state.feedbackById,
          [bookId]: {
            type: 'error',
            message: error?.payload?.message || error?.message || 'Không thể lưu trạng thái lúc này.'
          }
        }
      };
      render();
      console.error(error);
    });
  });
};

export const initAdminBooksPage = function () {
  if (!getContent()) {
    return;
  }

  bindFilter();
  bindSearch();
  bindActions();
  render();
  void loadBooks();
};
