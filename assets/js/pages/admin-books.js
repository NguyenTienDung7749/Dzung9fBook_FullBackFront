import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminBooks, updateAdminBookInventory } from '../services/admin.js';

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
    return 'Khong ro thoi gian';
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
    isSoldOut: Boolean(book?.isSoldOut),
    trackInventory: Boolean(book?.trackInventory),
    stockQuantityInput: Number.isInteger(book?.stockQuantity) ? String(book.stockQuantity) : '',
    allowBackorder: Boolean(book?.allowBackorder)
  };
};

const getDraftForBook = function (book) {
  const key = String(book?.id || '').trim();
  return state.draftById[key] || buildDraftFromBook(book);
};

const resolveInventoryLabel = function (draft) {
  if (draft.isSoldOut) {
    return 'Sold out';
  }

  if (!draft.trackInventory) {
    return 'Khong theo doi ton kho';
  }

  if (draft.allowBackorder) {
    return 'Theo doi ton kho / cho phep backorder';
  }

  const quantity = Number.parseInt(String(draft.stockQuantityInput || '').trim(), 10);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 'Theo doi ton kho / dang het hang';
  }

  return `Theo doi ton kho / con ${quantity} cuon`;
};

const matchesInventoryFilter = function (draft) {
  if (!state.filter) {
    return true;
  }

  if (state.filter === 'tracked') {
    return draft.trackInventory;
  }

  if (state.filter === 'sold-out') {
    return draft.isSoldOut;
  }

  if (state.filter === 'backorder') {
    return draft.trackInventory && draft.allowBackorder;
  }

  return true;
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);

  return (Array.isArray(state.items) ? state.items : []).filter(function (book) {
    const draft = getDraftForBook(book);

    if (!matchesInventoryFilter(draft)) {
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
    ? `Dang hien thi ${visibleCount} / ${totalCount} tua sach phu hop voi bo loc hien tai.`
    : `Dang hien thi ${visibleCount} tua sach de staff/admin cap nhat ton kho.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildBookCardMarkup = function (book) {
  const bookId = String(book?.id || '').trim();
  const isPending = state.pendingBookId === bookId;
  const feedback = state.feedbackById[bookId] || null;
  const draft = getDraftForBook(book);

  return `
    <article class="profile-card admin-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(resolveInventoryLabel(draft))}</p>
        <h2 class="profile-card__title">${escapeHTML(book.title || 'Tua sach')}</h2>
        <p class="profile-card__text">Handle: ${escapeHTML(book.handle || 'N/A')}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>Tac gia</dt>
          <dd>${escapeHTML(book.author || 'Dang cap nhat')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>SKU</dt>
          <dd>${escapeHTML(book.sku || 'Chua co')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Gia ban</dt>
          <dd>${escapeHTML(formatPrice(book.price || 0))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Danh muc</dt>
          <dd>${escapeHTML([book.categoryLabel, book.subcategoryLabel].filter(Boolean).join(' / ') || 'Chua gan')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>ID sach</dt>
          <dd>${escapeHTML(bookId || 'N/A')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Cap nhat cuoi</dt>
          <dd>${escapeHTML(formatDateTime(book.updatedAt))}</dd>
        </div>
      </dl>

      <form class="admin-status-form" data-admin-book-form data-book-id="${escapeHTML(bookId)}">
        <div class="admin-status-form__grid admin-status-form__grid--inventory">
          <label class="form-field">
            <span class="label-text">So luong ton kho</span>
            <input
              type="number"
              name="stockQuantity"
              min="0"
              step="1"
              inputmode="numeric"
              value="${escapeHTML(draft.stockQuantityInput)}"
              ${isPending ? 'disabled' : ''}
            >
            <span class="admin-field-hint">Bat track inventory neu muon checkout bi chan theo so luong con lai.</span>
          </label>

          <div class="admin-checklist">
            <label class="admin-check">
              <input type="checkbox" name="trackInventory" ${draft.trackInventory ? 'checked' : ''} ${isPending ? 'disabled' : ''}>
              <span>Theo doi ton kho</span>
            </label>

            <label class="admin-check">
              <input type="checkbox" name="isSoldOut" ${draft.isSoldOut ? 'checked' : ''} ${isPending ? 'disabled' : ''}>
              <span>Danh dau sold out</span>
            </label>

            <label class="admin-check">
              <input type="checkbox" name="allowBackorder" ${draft.allowBackorder ? 'checked' : ''} ${isPending ? 'disabled' : ''}>
              <span>Cho phep backorder</span>
            </label>
          </div>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Dang luu...' : 'Luu ton kho'}
        </button>
      </form>
    </article>
  `;
};

const syncInventoryForm = function (form) {
  if (!form) {
    return;
  }

  const trackInventory = form.elements.trackInventory;
  const isSoldOut = form.elements.isSoldOut;
  const allowBackorder = form.elements.allowBackorder;
  const stockQuantity = form.elements.stockQuantity;
  const isPending = state.pendingBookId === String(form.dataset.bookId || '').trim();
  const isTracked = Boolean(trackInventory?.checked);
  const isMarkedSoldOut = Boolean(isSoldOut?.checked);

  if (allowBackorder && (!isTracked || isMarkedSoldOut)) {
    allowBackorder.checked = false;
  }

  if (stockQuantity) {
    stockQuantity.disabled = isPending || !isTracked;
    stockQuantity.required = isTracked;
  }

  if (allowBackorder) {
    allowBackorder.disabled = isPending || !isTracked || isMarkedSoldOut;
  }
};

const render = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  if (!isApiProviderMode()) {
    container.innerHTML = buildStateMarkup(
      'Admin inventory chi ho tro khi chay backend',
      'Trang nay can API mode de tai va cap nhat du lieu ton kho thuc te trong DB.',
      '<a href="./index.html" class="btn btn-secondary">Quay ve trang chu</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Dang tai danh sach sach',
      'Chung minh dang dong bo catalog tu backend de staff/admin cap nhat ton kho.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Ban can dang nhap',
      'Vui long dang nhap bang tai khoan staff/admin de truy cap khu vuc quan ly ton kho.',
      '<a href="./login.html" class="btn btn-primary">Dang nhap</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Ban khong co quyen truy cap',
      'Tai khoan hien tai khong thuoc nhom staff/admin nen khong the dung trang inventory nay.',
      '<a href="./profile.html" class="btn btn-secondary">Ve ho so</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Khong the tai du lieu ton kho',
      'Backend chua phan hoi on dinh luc nay. Vui long thu tai lai trang hoac quay lai sau.',
      '<a href="./admin-books.html" class="btn btn-primary">Thu tai lai</a>'
    );
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chua co tua sach nao trong DB',
      'Danh sach sach hien dang trong, vi vay chua co du lieu ton kho de cap nhat.'
    );
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'Khong co ket qua phu hop',
      'Thu doi tu khoa tim kiem hoac bo loc inventory de xem nhieu tua sach hon.'
    );
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    <div class="admin-list">
      ${visibleItems.map(buildBookCardMarkup).join('')}
    </div>
  `;

  container.querySelectorAll('[data-admin-book-form]').forEach(function (form) {
    syncInventoryForm(form);
  });
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

const captureDraftFromForm = function (form) {
  return {
    isSoldOut: Boolean(form.elements.isSoldOut?.checked),
    trackInventory: Boolean(form.elements.trackInventory?.checked),
    stockQuantityInput: String(form.elements.stockQuantity?.value || '').trim(),
    allowBackorder: Boolean(form.elements.allowBackorder?.checked)
  };
};

const parseStockQuantityInput = function (value) {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return null;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return Number.NaN;
  }

  return Number.parseInt(normalizedValue, 10);
};

const buildInventoryPayload = function (draft) {
  const parsedStockQuantity = parseStockQuantityInput(draft.stockQuantityInput);

  if (draft.trackInventory && (!Number.isInteger(parsedStockQuantity) || parsedStockQuantity < 0)) {
    throw new Error('Can nhap so luong ton kho tu 0 tro len khi bat theo doi ton kho.');
  }

  return {
    isSoldOut: Boolean(draft.isSoldOut),
    trackInventory: Boolean(draft.trackInventory),
    stockQuantity: draft.trackInventory ? parsedStockQuantity : null,
    allowBackorder: Boolean(draft.allowBackorder)
  };
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    state = {
      ...state,
      filter: String(filter.value || '').trim()
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
    syncInventoryForm(form);
    setDraftForBook(bookId, captureDraftFromForm(form));
  });

  container.addEventListener('input', function (event) {
    const form = event.target.closest('[data-admin-book-form]');

    if (!form) {
      return;
    }

    const bookId = String(form.dataset.bookId || '').trim();
    setDraftForBook(bookId, captureDraftFromForm(form));
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

    const draft = captureDraftFromForm(form);
    let payload;

    try {
      payload = buildInventoryPayload(draft);
    } catch (error) {
      setDraftForBook(bookId, draft);
      state = {
        ...state,
        feedbackById: {
          ...state.feedbackById,
          [bookId]: {
            type: 'error',
            message: error.message || 'Du lieu ton kho chua hop le.'
          }
        }
      };
      render();
      return;
    }

    setDraftForBook(bookId, draft);
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
            message: 'Da cap nhat ton kho sach.'
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
            message: error?.payload?.message || error?.message || 'Khong the luu ton kho luc nay.'
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
