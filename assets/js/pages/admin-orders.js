import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminOrders, updateAdminOrderStatus } from '../services/admin.js';

const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chá» xÃ¡c nháº­n',
  CONFIRMED: 'ÄÃ£ xÃ¡c nháº­n',
  CANCELLED: 'ÄÃ£ há»§y',
  COMPLETED: 'HoÃ n táº¥t'
};

const PAYMENT_STATUS_LABELS = {
  UNPAID: 'ChÆ°a thanh toÃ¡n',
  PAID: 'ÄÃ£ thanh toÃ¡n',
  VOID: 'VÃ´ hiá»‡u'
};

const ORDER_STATUS_OPTIONS = [
  ['PENDING_CONFIRMATION', 'Chá» xÃ¡c nháº­n'],
  ['CONFIRMED', 'ÄÃ£ xÃ¡c nháº­n'],
  ['CANCELLED', 'ÄÃ£ há»§y'],
  ['COMPLETED', 'HoÃ n táº¥t']
];

const PAYMENT_STATUS_OPTIONS = [
  ['UNPAID', 'ChÆ°a thanh toÃ¡n'],
  ['PAID', 'ÄÃ£ thanh toÃ¡n'],
  ['VOID', 'VÃ´ hiá»‡u']
];

let state = {
  status: 'idle',
  filter: '',
  searchTerm: '',
  items: [],
  pendingOrderId: '',
  feedbackById: {}
};

const getContent = function () {
  return qs('[data-admin-orders-content]');
};

const getFilter = function () {
  return qs('[data-admin-orders-filter]');
};

const getSearchInput = function () {
  return qs('[data-admin-orders-search]');
};

const normalizeSearchText = function (value) {
  return String(value || '').trim().toLowerCase();
};

const formatDateTime = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'KhÃ´ng rÃµ thá»i gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Äang xá»­ lÃ½';
};

const resolvePaymentStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return PAYMENT_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'KhÃ´ng rÃµ';
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

const buildOptionsMarkup = function (options, currentValue) {
  return options.map(function ([value, label]) {
    const normalizedValue = String(value || '').trim().toUpperCase();
    const isSelected = normalizedValue === String(currentValue || '').trim().toUpperCase();
    return `<option value="${normalizedValue}" ${isSelected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
  }).join('');
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);

  if (!searchTerm) {
    return Array.isArray(state.items) ? state.items : [];
  }

  return (Array.isArray(state.items) ? state.items : []).filter(function (order) {
    return [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.customerPhone
    ].some(function (value) {
      return normalizeSearchText(value).includes(searchTerm);
    });
  });
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(String(state.filter || '').trim()) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Äang hiá»ƒn thá»‹ ${visibleCount} / ${totalCount} Ä‘Æ¡n hÃ ng phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.`
    : `Äang hiá»ƒn thá»‹ ${visibleCount} Ä‘Æ¡n hÃ ng má»›i nháº¥t.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildOrderCardMarkup = function (order) {
  const orderId = String(order?.id || '').trim();
  const isPending = state.pendingOrderId === orderId;
  const feedback = state.feedbackById[orderId] || null;

  return `
    <article class="profile-card admin-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(resolveOrderStatusLabel(order.status))}</p>
        <h2 class="profile-card__title">${escapeHTML(order.orderNumber || 'ÄÆ¡n hÃ ng')}</h2>
        <p class="profile-card__text">Táº¡o lÃºc ${escapeHTML(formatDateTime(order.createdAt))}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>KhÃ¡ch hÃ ng</dt>
          <dd>${escapeHTML(order.customerName || 'ChÆ°a cÃ³')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Email</dt>
          <dd>${escapeHTML(order.customerEmail || 'ChÆ°a cÃ³')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Sá»‘ Ä‘iá»‡n thoáº¡i</dt>
          <dd>${escapeHTML(order.customerPhone || 'ChÆ°a cÃ³')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Tráº¡ng thÃ¡i thanh toÃ¡n</dt>
          <dd>${escapeHTML(resolvePaymentStatusLabel(order.paymentStatus))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Tá»•ng tiá»n</dt>
          <dd>${escapeHTML(formatPrice(order.totalAmount || 0))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Sá»‘ lÆ°á»£ng sÃ¡ch</dt>
          <dd>${escapeHTML(String(Number(order.itemCount || 0)))}</dd>
        </div>
      </dl>

      <form class="admin-status-form" data-admin-order-form data-order-id="${escapeHTML(orderId)}">
        <div class="admin-status-form__grid">
          <label class="form-field">
            <span class="label-text">Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(ORDER_STATUS_OPTIONS, order.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Tráº¡ng thÃ¡i thanh toÃ¡n</span>
            <select name="paymentStatus" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(PAYMENT_STATUS_OPTIONS, order.paymentStatus)}
            </select>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
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
      'Admin UI chá»‰ há»— trá»£ khi cháº¡y backend',
      'Trang nÃ y cáº§n API mode Ä‘á»ƒ táº£i vÃ  cáº­p nháº­t dá»¯ liá»‡u quáº£n trá»‹.',
      '<a href="./index.html" class="btn btn-secondary">Quay vá» trang chá»§</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Äang táº£i danh sÃ¡ch Ä‘Æ¡n hÃ ng',
      'ChÃºng mÃ¬nh Ä‘ang Ä‘á»“ng bá»™ dá»¯ liá»‡u Ä‘Æ¡n hÃ ng má»›i nháº¥t tá»« backend.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Báº¡n cáº§n Ä‘Äƒng nháº­p',
      'Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng tÃ i khoáº£n staff/admin Ä‘á»ƒ truy cáº­p khu vá»±c quáº£n trá»‹ Ä‘Æ¡n hÃ ng.',
      '<a href="./login.html" class="btn btn-primary">ÄÄƒng nháº­p</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p',
      'TÃ i khoáº£n hiá»‡n táº¡i khÃ´ng thuá»™c nhÃ³m staff/admin nÃªn khÃ´ng thá»ƒ dÃ¹ng trang quáº£n trá»‹ nÃ y.',
      '<a href="./profile.html" class="btn btn-secondary">Vá» há»“ sÆ¡</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'KhÃ´ng thá»ƒ táº£i Ä‘Æ¡n hÃ ng',
      'Backend chÆ°a pháº£n há»“i á»•n Ä‘á»‹nh lÃºc nÃ y. Vui lÃ²ng thá»­ táº£i láº¡i trang hoáº·c quay láº¡i sau.',
      '<a href="./admin-orders.html" class="btn btn-primary">Thá»­ táº£i láº¡i</a>'
    );
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng phÃ¹ há»£p',
      state.filter
        ? 'KhÃ´ng cÃ³ Ä‘Æ¡n hÃ ng nÃ o khá»›p vá»›i bá»™ lá»c tráº¡ng thÃ¡i hiá»‡n táº¡i.'
        : 'Danh sÃ¡ch Ä‘Æ¡n hÃ ng hiá»‡n Ä‘ang trá»‘ng.'
    );
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'KhÃ´ng cÃ³ káº¿t quáº£ phÃ¹ há»£p',
      'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng nÃ o khá»›p vá»›i tá»« khÃ³a tÃ¬m kiáº¿m hiá»‡n táº¡i.'
    );
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    <div class="admin-list">
      ${visibleItems.map(buildOrderCardMarkup).join('')}
    </div>
  `;
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingOrderId: '',
      feedbackById: {}
    };
    render();
    return true;
  }

  if (error?.status === 403) {
    state = {
      ...state,
      status: 'forbidden',
      items: [],
      pendingOrderId: '',
      feedbackById: {}
    };
    render();
    return true;
  }

  return false;
};

const loadOrders = async function () {
  state = {
    ...state,
    status: 'loading',
    items: [],
    pendingOrderId: '',
    feedbackById: {}
  };
  render();

  try {
    const items = await getAdminOrders(state.filter);
    state = {
      ...state,
      status: 'ready',
      items: Array.isArray(items) ? items : [],
      pendingOrderId: '',
      feedbackById: {}
    };
  } catch (error) {
    if (setPageStateFromError(error)) {
      return;
    }

    state = {
      ...state,
      status: 'error',
      items: [],
      pendingOrderId: '',
      feedbackById: {}
    };
    console.error(error);
  }

  render();
};

const updateOrderInState = function (orderId, patch) {
  state = {
    ...state,
    items: state.items.map(function (item) {
      return item.id === orderId ? { ...item, ...patch } : item;
    })
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
    void loadOrders();
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

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-order-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const orderId = String(form.dataset.orderId || '').trim();

    if (!orderId || state.pendingOrderId) {
      return;
    }

    state = {
      ...state,
      pendingOrderId: orderId,
      feedbackById: {
        ...state.feedbackById,
        [orderId]: null
      }
    };
    render();

    void updateAdminOrderStatus(orderId, {
      status: String(form.elements.status?.value || '').trim(),
      paymentStatus: String(form.elements.paymentStatus?.value || '').trim()
    }).then(function (updatedOrder) {
      updateOrderInState(orderId, updatedOrder || {});
      state = {
        ...state,
        pendingOrderId: '',
        feedbackById: {
          ...state.feedbackById,
          [orderId]: {
            type: 'success',
            message: 'ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng.'
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
        pendingOrderId: '',
        feedbackById: {
          ...state.feedbackById,
          [orderId]: {
            type: 'error',
            message: error?.payload?.message || error?.message || 'KhÃ´ng thá»ƒ lÆ°u thay Ä‘á»•i lÃºc nÃ y.'
          }
        }
      };
      render();
      console.error(error);
    });
  });
};

export const initAdminOrdersPage = function () {
  if (!getContent()) {
    return;
  }

  bindFilter();
  bindSearch();
  bindActions();
  render();
  void loadOrders();
};
