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
  draftById: {},
  selectedBookId: ''
};

let lastBookTrigger = null;
let bookKeyboardBound = false;

const getContent = function () {
  return qs('[data-admin-books-content]');
};

const getFilter = function () {
  return qs('[data-admin-books-filter]');
};

const getSearchInput = function () {
  return qs('[data-admin-books-search]');
};

const normalizeText = function (value) {
  return String(value || '').trim();
};

const normalizeSearchText = function (value) {
  return normalizeText(value).toLowerCase();
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

const syncBodyModalState = function (isOpen) {
  document.body.classList.toggle('admin-modal-open', Boolean(isOpen));
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
    <div class="form-message is-visible ${feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(feedback.message)}
    </div>
  `;
};

const buildStatusBadgeMarkup = function (label, tone) {
  return `
    <span class="admin-status-badge admin-status-badge--${escapeHTML(tone || 'neutral')}">
      ${escapeHTML(label)}
    </span>
  `;
};

const buildListStatMarkup = function (label, value) {
  return `
    <div class="admin-list-stat">
      <dt>${escapeHTML(label)}</dt>
      <dd>${escapeHTML(value)}</dd>
    </div>
  `;
};

const buildMetaItemMarkup = function (label, value) {
  return `
    <div class="admin-meta__item">
      <dt>${escapeHTML(label)}</dt>
      <dd>${escapeHTML(value)}</dd>
    </div>
  `;
};

const buildDraftFromBook = function (book) {
  return {
    isSoldOut: Boolean(book?.isSoldOut)
  };
};

const getDraftForBook = function (book) {
  const bookId = normalizeText(book?.id);
  return state.draftById[bookId] || buildDraftFromBook(book);
};

const setDraftForBook = function (bookId, draft) {
  state = {
    ...state,
    draftById: {
      ...state.draftById,
      [bookId]: draft
    },
    feedbackById: {
      ...state.feedbackById,
      [bookId]: null
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

const buildInventoryStatusLabel = function (isSoldOut) {
  return isSoldOut ? 'Hết hàng' : 'Còn hàng';
};

const buildInventorySummary = function (draft) {
  return draft.isSoldOut
    ? 'Hết hàng = stock 0, track inventory bật, backorder tắt.'
    : 'Còn hàng = stock 500, track inventory bật, backorder tắt.';
};

const buildCategoryLine = function (book) {
  return [book?.categoryLabel, book?.subcategoryLabel].filter(Boolean).join(' / ') || 'Chưa gán danh mục';
};

const buildSkuHandleLine = function (book) {
  const parts = [];

  if (normalizeText(book?.sku)) {
    parts.push(`SKU ${normalizeText(book.sku)}`);
  }

  if (normalizeText(book?.handle)) {
    parts.push(`Handle ${normalizeText(book.handle)}`);
  }

  return parts.join(' • ') || 'Chưa có SKU hoặc handle';
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);
  const items = Array.isArray(state.items) ? state.items : [];

  return items.filter(function (book) {
    if (state.filter === 'sold-out' && !book.isSoldOut) {
      return false;
    }

    if (state.filter === 'in-stock' && book.isSoldOut) {
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

const getSelectedBook = function (visibleItems) {
  const selectedBook = (Array.isArray(visibleItems) ? visibleItems : []).find(function (book) {
    return normalizeText(book.id) === normalizeText(state.selectedBookId);
  }) || null;

  if (!selectedBook && state.selectedBookId) {
    state = {
      ...state,
      selectedBookId: ''
    };
  }

  return selectedBook;
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(normalizeText(state.filter)) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Đang hiển thị ${visibleCount} / ${totalCount} tựa sách phù hợp với bộ lọc hiện tại.`
    : `Đang hiển thị ${visibleCount} tựa sách với simple inventory 500/0.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildBookDetailMarkup = function (book) {
  const bookId = normalizeText(book?.id);
  const draft = getDraftForBook(book);
  const isPending = normalizeText(state.pendingBookId) === bookId;
  const feedback = state.feedbackById[bookId] || null;

  return `
    <div class="admin-detail">
      <div class="admin-detail__header">
        <div class="admin-detail__title-block">
          <p class="profile-card__eyebrow">Chi tiết tồn kho</p>
          <h2 class="admin-detail__title" id="admin-book-modal-title">${escapeHTML(book.title || 'Tựa sách')}</h2>
          <p class="admin-detail__text">${escapeHTML(normalizeText(book.author) || 'Đang cập nhật tác giả')}</p>
        </div>

        <div class="admin-badge-row">
          ${buildStatusBadgeMarkup(buildInventoryStatusLabel(book.isSoldOut), book.isSoldOut ? 'danger' : 'success')}
        </div>
      </div>

      <dl class="admin-meta admin-meta--detail">
        ${buildMetaItemMarkup('Danh mục', buildCategoryLine(book))}
        ${buildMetaItemMarkup('SKU / Handle', buildSkuHandleLine(book))}
        ${buildMetaItemMarkup('Giá bán', formatPrice(book.price || 0))}
        ${buildMetaItemMarkup('Tồn kho hiệu lực', String(Number(book.stockQuantity || 0)))}
        ${buildMetaItemMarkup('Track inventory', book.trackInventory ? 'Bật' : 'Tắt')}
        ${buildMetaItemMarkup('Cập nhật', formatDateTime(book.updatedAt))}
      </dl>

      <form class="admin-status-form" data-admin-book-form data-book-id="${escapeHTML(bookId)}">
        <div class="admin-checklist">
          <label class="admin-check">
            <input type="checkbox" name="isSoldOut" ${draft.isSoldOut ? 'checked' : ''} ${isPending ? 'disabled' : ''}>
            <span>Đánh dấu hết hàng</span>
          </label>
          <p class="admin-simple-rule">${escapeHTML(buildInventorySummary(draft))}</p>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu trạng thái'}
        </button>
      </form>
    </div>
  `;
};

const buildBookModalMarkup = function (book) {
  const isPending = normalizeText(state.pendingBookId) === normalizeText(book?.id);

  return `
    <div class="admin-modal" data-admin-book-modal>
      <button
        class="admin-modal__backdrop"
        type="button"
        data-admin-book-close
        aria-label="Đóng popup chi tiết tồn kho"
        ${isPending ? 'disabled' : ''}
      ></button>

      <div class="admin-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="admin-book-modal-title">
        <div class="admin-modal__topbar">
          <div class="admin-modal__heading">
            <p class="profile-card__eyebrow">Quản lý tồn kho</p>
            <h2 class="admin-modal__title">Chi tiết tựa sách</h2>
          </div>

          <button
            class="admin-modal__close"
            type="button"
            data-admin-book-close
            aria-label="Đóng popup chi tiết tồn kho"
            ${isPending ? 'disabled' : ''}
          >
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>

        <div class="admin-modal__content">
          ${buildBookDetailMarkup(book)}
        </div>
      </div>
    </div>
  `;
};

const buildBookListItemMarkup = function (book, selectedBookId) {
  const bookId = normalizeText(book?.id);
  const isSelected = bookId === selectedBookId;
  const isInteractionLocked = Boolean(normalizeText(state.pendingBookId));

  return `
    <article class="admin-list-item${isSelected ? ' is-selected' : ''}">
      <button
        class="admin-list-item__button"
        type="button"
        data-admin-book-select
        data-book-id="${escapeHTML(bookId)}"
        aria-haspopup="dialog"
        aria-expanded="${isSelected ? 'true' : 'false'}"
        ${isInteractionLocked ? 'disabled' : ''}
      >
        <div class="admin-list-item__main">
          <div class="admin-list-item__title-block">
            <p class="admin-list-item__eyebrow">${escapeHTML(buildCategoryLine(book))}</p>
            <h3 class="admin-list-item__title">${escapeHTML(book.title || 'Tựa sách')}</h3>
            <p class="admin-list-item__text">${escapeHTML(normalizeText(book.author) || 'Đang cập nhật tác giả')}</p>
            <p class="admin-list-item__subtext">${escapeHTML(buildSkuHandleLine(book))}</p>
          </div>

          <div class="admin-badge-row">
            ${buildStatusBadgeMarkup(buildInventoryStatusLabel(book.isSoldOut), book.isSoldOut ? 'danger' : 'success')}
          </div>
        </div>

        <div class="admin-list-item__footer">
          <dl class="admin-list-stats">
            ${buildListStatMarkup('Giá bán', formatPrice(book.price || 0))}
            ${buildListStatMarkup('Cập nhật', formatDateTime(book.updatedAt))}
          </dl>
          <span class="admin-list-item__action">Xem chi tiết</span>
        </div>
      </button>
    </article>
  `;
};

const buildListPanelMarkup = function (visibleItems, selectedBook) {
  return `
    <section class="profile-card admin-panel">
      <div class="admin-panel__header">
        <p class="profile-card__eyebrow">Danh sách</p>
        <h2 class="admin-panel__title">Tựa sách phù hợp</h2>
      </div>

      <div class="admin-list">
        ${visibleItems.map(function (book) {
          return buildBookListItemMarkup(book, normalizeText(selectedBook?.id));
        }).join('')}
      </div>
    </section>
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
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách sách',
      'Chúng mình đang đồng bộ catalog từ backend để staff/admin cập nhật tồn kho.'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản staff/admin để truy cập khu vực quản lý tồn kho.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm staff/admin nên không thể dùng trang inventory này.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải dữ liệu tồn kho',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin-books.html" class="btn btn-primary">Thử tải lại</a>'
    );
    syncBodyModalState(false);
    return;
  }

  const visibleItems = getVisibleItems();
  const selectedBook = getSelectedBook(visibleItems);

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chưa có tựa sách nào trong DB',
      'Danh sách sách hiện đang trống, vì vậy chưa có dữ liệu tồn kho để cập nhật.'
    );
    syncBodyModalState(false);
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'Không có kết quả phù hợp',
      'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem nhiều tựa sách hơn.'
    );
    syncBodyModalState(false);
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    ${buildListPanelMarkup(visibleItems, selectedBook)}
    ${selectedBook ? buildBookModalMarkup(selectedBook) : ''}
  `;
  syncBodyModalState(Boolean(selectedBook));
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingBookId: '',
      feedbackById: {},
      draftById: {},
      selectedBookId: ''
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
      draftById: {},
      selectedBookId: ''
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

const closeBookModal = function (restoreFocus = true) {
  if (!state.selectedBookId || state.pendingBookId) {
    return;
  }

  state = {
    ...state,
    selectedBookId: ''
  };
  render();

  if (restoreFocus && lastBookTrigger && typeof lastBookTrigger.focus === 'function') {
    lastBookTrigger.focus();
  }
};

const bindKeyboard = function () {
  if (bookKeyboardBound) {
    return;
  }

  bookKeyboardBound = true;

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !state.selectedBookId || state.pendingBookId) {
      return;
    }

    closeBookModal();
  });
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    const nextFilter = normalizeText(filter.value);

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
      searchTerm: normalizeText(searchInput.value)
    };
    render();
  });
};

const bindActions = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  container.addEventListener('click', function (event) {
    const closeButton = event.target.closest('[data-admin-book-close]');

    if (closeButton) {
      closeBookModal();
      return;
    }

    const selectButton = event.target.closest('[data-admin-book-select]');

    if (!selectButton || state.pendingBookId) {
      return;
    }

    const bookId = normalizeText(selectButton.dataset.bookId);

    if (!bookId) {
      return;
    }

    lastBookTrigger = selectButton;
    state = {
      ...state,
      selectedBookId: bookId
    };
    render();
  });

  container.addEventListener('change', function (event) {
    const form = event.target.closest('[data-admin-book-form]');

    if (!form) {
      return;
    }

    const bookId = normalizeText(form.dataset.bookId);

    if (!bookId) {
      return;
    }

    setDraftForBook(bookId, {
      isSoldOut: Boolean(form.elements.isSoldOut?.checked)
    });
    render();
  });

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-book-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const bookId = normalizeText(form.dataset.bookId);

    if (!bookId || state.pendingBookId) {
      return;
    }

    const payload = {
      isSoldOut: Boolean(form.elements.isSoldOut?.checked)
    };

    setDraftForBook(bookId, payload);
    state = {
      ...state,
      pendingBookId: bookId
    };
    render();

    void updateAdminBookInventory(bookId, payload).then(function (updatedBook) {
      const normalizedFilter = normalizeText(state.filter);
      const shouldKeepItem = normalizedFilter === 'sold-out'
        ? Boolean(updatedBook?.isSoldOut)
        : normalizedFilter === 'in-stock'
          ? !Boolean(updatedBook?.isSoldOut)
          : true;
      const nextDraftById = { ...state.draftById };
      const nextFeedbackById = { ...state.feedbackById };

      delete nextDraftById[bookId];

      if (!shouldKeepItem) {
        delete nextFeedbackById[bookId];
      } else {
        nextFeedbackById[bookId] = {
          type: 'success',
          message: 'Đã cập nhật trạng thái tồn kho.'
        };
      }

      state = {
        ...state,
        pendingBookId: '',
        selectedBookId: shouldKeepItem ? bookId : '',
        items: shouldKeepItem
          ? state.items.map(function (item) {
            return normalizeText(item.id) === bookId ? { ...item, ...(updatedBook || {}) } : item;
          })
          : state.items.filter(function (item) {
            return normalizeText(item.id) !== bookId;
          }),
        draftById: nextDraftById,
        feedbackById: nextFeedbackById
      };
      render();
    }).catch(function (error) {
      if (setPageStateFromError(error)) {
        return;
      }

      clearDraftForBook(bookId);
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

  bindKeyboard();
  bindFilter();
  bindSearch();
  bindActions();
  render();
  void loadBooks();
};
