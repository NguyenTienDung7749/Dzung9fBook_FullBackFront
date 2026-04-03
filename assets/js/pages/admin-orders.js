import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminOrders, updateAdminOrderStatus } from '../services/admin.js';

const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

const PAYMENT_STATUS_LABELS = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  VOID: 'Vô hiệu'
};

const ORDER_STATUS_OPTIONS = [
  ['PENDING_CONFIRMATION', 'Chờ xác nhận'],
  ['CONFIRMED', 'Đã xác nhận'],
  ['CANCELLED', 'Đã hủy'],
  ['COMPLETED', 'Hoàn tất']
];

const PAYMENT_STATUS_OPTIONS = [
  ['UNPAID', 'Chưa thanh toán'],
  ['PAID', 'Đã thanh toán'],
  ['VOID', 'Vô hiệu']
];

const ORDER_STATUS_TONES = {
  PENDING_CONFIRMATION: 'warning',
  CONFIRMED: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'success'
};

const PAYMENT_STATUS_TONES = {
  UNPAID: 'warning',
  PAID: 'success',
  VOID: 'danger'
};

let state = {
  status: 'idle',
  filter: '',
  searchTerm: '',
  items: [],
  pendingOrderId: '',
  feedbackById: {},
  selectedOrderId: '',
  draftById: {}
};

let lastOrderTrigger = null;
let orderKeyboardBound = false;

const getContent = function () {
  return qs('[data-admin-orders-content]');
};

const getFilter = function () {
  return qs('[data-admin-orders-filter]');
};

const getSearchInput = function () {
  return qs('[data-admin-orders-search]');
};

const normalizeText = function (value) {
  return String(value || '').trim();
};

const normalizeSearchText = function (value) {
  return normalizeText(value).toLowerCase();
};

const normalizeEnumValue = function (value) {
  return normalizeText(value).toUpperCase();
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

const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = normalizeEnumValue(status);
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
};

const resolvePaymentStatusLabel = function (status) {
  const normalizedStatus = normalizeEnumValue(status);
  return PAYMENT_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Không rõ';
};

const resolveOrderStatusTone = function (status) {
  const normalizedStatus = normalizeEnumValue(status);
  return ORDER_STATUS_TONES[normalizedStatus] || 'neutral';
};

const resolvePaymentStatusTone = function (status) {
  const normalizedStatus = normalizeEnumValue(status);
  return PAYMENT_STATUS_TONES[normalizedStatus] || 'neutral';
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

const buildOptionsMarkup = function (options, currentValue) {
  return options.map(function ([value, label]) {
    const normalizedValue = normalizeEnumValue(value);
    const isSelected = normalizedValue === normalizeEnumValue(currentValue);
    return `<option value="${normalizedValue}" ${isSelected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
  }).join('');
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

const buildDraftFromOrder = function (order) {
  return {
    status: normalizeEnumValue(order?.status),
    paymentStatus: normalizeEnumValue(order?.paymentStatus)
  };
};

const getDraftForOrder = function (order) {
  const orderId = normalizeText(order?.id);
  return state.draftById[orderId] || buildDraftFromOrder(order);
};

const setDraftForOrder = function (orderId, draft) {
  state = {
    ...state,
    draftById: {
      ...state.draftById,
      [orderId]: draft
    },
    feedbackById: {
      ...state.feedbackById,
      [orderId]: null
    }
  };
};

const clearDraftForOrder = function (orderId) {
  const nextDraftById = { ...state.draftById };
  delete nextDraftById[orderId];

  state = {
    ...state,
    draftById: nextDraftById
  };
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);
  const items = Array.isArray(state.items) ? state.items : [];

  if (!searchTerm) {
    return items;
  }

  return items.filter(function (order) {
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

const getSelectedOrder = function (visibleItems) {
  const selectedOrder = (Array.isArray(visibleItems) ? visibleItems : []).find(function (order) {
    return normalizeText(order.id) === normalizeText(state.selectedOrderId);
  }) || null;

  if (!selectedOrder && state.selectedOrderId) {
    state = {
      ...state,
      selectedOrderId: ''
    };
  }

  return selectedOrder;
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(normalizeText(state.filter)) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Đang hiển thị ${visibleCount} / ${totalCount} đơn hàng phù hợp với bộ lọc hiện tại.`
    : `Đang hiển thị ${visibleCount} đơn hàng mới nhất.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildOrderContactLine = function (order) {
  const parts = [
    normalizeText(order?.customerName) || 'Khách hàng chưa cập nhật',
    normalizeText(order?.customerPhone) || normalizeText(order?.customerEmail) || 'Chưa có thông tin liên hệ'
  ].filter(Boolean);

  return parts.join(' • ');
};

const buildOrderDetailMarkup = function (order) {
  const orderId = normalizeText(order?.id);
  const draft = getDraftForOrder(order);
  const isPending = normalizeText(state.pendingOrderId) === orderId;
  const feedback = state.feedbackById[orderId] || null;

  return `
    <div class="admin-detail">
      <div class="admin-detail__header">
        <div class="admin-detail__title-block">
          <p class="profile-card__eyebrow">Chi tiết đơn hàng</p>
          <h2 class="admin-detail__title" id="admin-order-modal-title">${escapeHTML(order.orderNumber || 'Đơn hàng')}</h2>
          <p class="admin-detail__text">Tạo lúc ${escapeHTML(formatDateTime(order.createdAt))}</p>
        </div>

        <div class="admin-badge-row">
          ${buildStatusBadgeMarkup(resolveOrderStatusLabel(order.status), resolveOrderStatusTone(order.status))}
          ${buildStatusBadgeMarkup(resolvePaymentStatusLabel(order.paymentStatus), resolvePaymentStatusTone(order.paymentStatus))}
        </div>
      </div>

      <dl class="admin-meta admin-meta--detail">
        ${buildMetaItemMarkup('Khách hàng', normalizeText(order.customerName) || 'Chưa có')}
        ${buildMetaItemMarkup('Email', normalizeText(order.customerEmail) || 'Chưa có')}
        ${buildMetaItemMarkup('Số điện thoại', normalizeText(order.customerPhone) || 'Chưa có')}
        ${buildMetaItemMarkup('Tổng tiền', formatPrice(order.totalAmount || 0))}
        ${buildMetaItemMarkup('Số lượng sách', String(Number(order.itemCount || 0)))}
        ${buildMetaItemMarkup('Mã đơn', normalizeText(order.orderNumber) || 'Chưa có')}
      </dl>

      <form class="admin-status-form" data-admin-order-form data-order-id="${escapeHTML(orderId)}">
        <div class="admin-status-form__grid">
          <label class="form-field">
            <span class="label-text">Trạng thái đơn hàng</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(ORDER_STATUS_OPTIONS, draft.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Trạng thái thanh toán</span>
            <select name="paymentStatus" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(PAYMENT_STATUS_OPTIONS, draft.paymentStatus)}
            </select>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  `;
};

const buildOrderModalMarkup = function (order) {
  const isPending = normalizeText(state.pendingOrderId) === normalizeText(order?.id);

  return `
    <div class="admin-modal" data-admin-order-modal>
      <button
        class="admin-modal__backdrop"
        type="button"
        data-admin-order-close
        aria-label="Đóng popup chi tiết đơn hàng"
        ${isPending ? 'disabled' : ''}
      ></button>

      <div class="admin-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="admin-order-modal-title">
        <div class="admin-modal__topbar">
          <div class="admin-modal__heading">
            <p class="profile-card__eyebrow">Quản lý đơn hàng</p>
            <h2 class="admin-modal__title">Chi tiết đơn hàng</h2>
          </div>

          <button
            class="admin-modal__close"
            type="button"
            data-admin-order-close
            aria-label="Đóng popup chi tiết đơn hàng"
            ${isPending ? 'disabled' : ''}
          >
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>

        <div class="admin-modal__content">
          ${buildOrderDetailMarkup(order)}
        </div>
      </div>
    </div>
  `;
};

const buildOrderListItemMarkup = function (order, selectedOrderId) {
  const orderId = normalizeText(order?.id);
  const isSelected = orderId === selectedOrderId;
  const isInteractionLocked = Boolean(normalizeText(state.pendingOrderId));

  return `
    <article class="admin-list-item${isSelected ? ' is-selected' : ''}">
      <button
        class="admin-list-item__button"
        type="button"
        data-admin-order-select
        data-order-id="${escapeHTML(orderId)}"
        aria-haspopup="dialog"
        aria-expanded="${isSelected ? 'true' : 'false'}"
        ${isInteractionLocked ? 'disabled' : ''}
      >
        <div class="admin-list-item__main">
          <div class="admin-list-item__title-block">
            <p class="admin-list-item__eyebrow">${escapeHTML(formatDateTime(order.createdAt))}</p>
            <h3 class="admin-list-item__title">${escapeHTML(order.orderNumber || 'Đơn hàng')}</h3>
            <p class="admin-list-item__text">${escapeHTML(buildOrderContactLine(order))}</p>
          </div>

          <div class="admin-badge-row">
            ${buildStatusBadgeMarkup(resolveOrderStatusLabel(order.status), resolveOrderStatusTone(order.status))}
            ${buildStatusBadgeMarkup(resolvePaymentStatusLabel(order.paymentStatus), resolvePaymentStatusTone(order.paymentStatus))}
          </div>
        </div>

        <div class="admin-list-item__footer">
          <dl class="admin-list-stats">
            ${buildListStatMarkup('Tổng tiền', formatPrice(order.totalAmount || 0))}
            ${buildListStatMarkup('Số lượng', String(Number(order.itemCount || 0)))}
          </dl>
          <span class="admin-list-item__action">Xem chi tiết</span>
        </div>
      </button>
    </article>
  `;
};

const buildListPanelMarkup = function (visibleItems, selectedOrder) {
  return `
    <section class="profile-card admin-panel">
      <div class="admin-panel__header">
        <p class="profile-card__eyebrow">Danh sách</p>
        <h2 class="admin-panel__title">Đơn hàng phù hợp</h2>
      </div>

      <div class="admin-list">
        ${visibleItems.map(function (order) {
          return buildOrderListItemMarkup(order, normalizeText(selectedOrder?.id));
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
      'Admin UI chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để tải và cập nhật dữ liệu quản trị.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách đơn hàng',
      'Chúng mình đang đồng bộ dữ liệu đơn hàng mới nhất từ backend.'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản admin để truy cập khu vực quản trị đơn hàng.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm admin nên không thể dùng trang quản trị này.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    syncBodyModalState(false);
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải đơn hàng',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin-orders.html" class="btn btn-primary">Thử tải lại</a>'
    );
    syncBodyModalState(false);
    return;
  }

  const visibleItems = getVisibleItems();
  const selectedOrder = getSelectedOrder(visibleItems);

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chưa có đơn hàng phù hợp',
      state.filter
        ? 'Không có đơn hàng nào khớp với bộ lọc trạng thái hiện tại.'
        : 'Danh sách đơn hàng hiện đang trống.'
    );
    syncBodyModalState(false);
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'Không có kết quả phù hợp',
      'Không tìm thấy đơn hàng nào khớp với từ khóa tìm kiếm hiện tại.'
    );
    syncBodyModalState(false);
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    ${buildListPanelMarkup(visibleItems, selectedOrder)}
    ${selectedOrder ? buildOrderModalMarkup(selectedOrder) : ''}
  `;
  syncBodyModalState(Boolean(selectedOrder));
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingOrderId: '',
      feedbackById: {},
      selectedOrderId: '',
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
      pendingOrderId: '',
      feedbackById: {},
      selectedOrderId: '',
      draftById: {}
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
    feedbackById: {},
    draftById: {}
  };
  render();

  try {
    const items = await getAdminOrders(state.filter);
    state = {
      ...state,
      status: 'ready',
      items: Array.isArray(items) ? items : [],
      pendingOrderId: '',
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
      pendingOrderId: '',
      feedbackById: {},
      draftById: {}
    };
    console.error(error);
  }

  render();
};

const closeOrderModal = function (restoreFocus = true) {
  if (!state.selectedOrderId || state.pendingOrderId) {
    return;
  }

  state = {
    ...state,
    selectedOrderId: ''
  };
  render();

  if (restoreFocus && lastOrderTrigger && typeof lastOrderTrigger.focus === 'function') {
    lastOrderTrigger.focus();
  }
};

const bindKeyboard = function () {
  if (orderKeyboardBound) {
    return;
  }

  orderKeyboardBound = true;

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !state.selectedOrderId || state.pendingOrderId) {
      return;
    }

    closeOrderModal();
  });
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    state = {
      ...state,
      filter: normalizeText(filter.value),
      feedbackById: {}
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
    const closeButton = event.target.closest('[data-admin-order-close]');

    if (closeButton) {
      closeOrderModal();
      return;
    }

    const selectButton = event.target.closest('[data-admin-order-select]');

    if (!selectButton || state.pendingOrderId) {
      return;
    }

    const orderId = normalizeText(selectButton.dataset.orderId);

    if (!orderId) {
      return;
    }

    lastOrderTrigger = selectButton;
    state = {
      ...state,
      selectedOrderId: orderId
    };
    render();
  });

  container.addEventListener('change', function (event) {
    const form = event.target.closest('[data-admin-order-form]');

    if (!form) {
      return;
    }

    const orderId = normalizeText(form.dataset.orderId);

    if (!orderId) {
      return;
    }

    setDraftForOrder(orderId, {
      status: normalizeEnumValue(form.elements.status?.value),
      paymentStatus: normalizeEnumValue(form.elements.paymentStatus?.value)
    });
    render();
  });

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-order-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const orderId = normalizeText(form.dataset.orderId);

    if (!orderId || state.pendingOrderId) {
      return;
    }

    const payload = {
      status: normalizeEnumValue(form.elements.status?.value),
      paymentStatus: normalizeEnumValue(form.elements.paymentStatus?.value)
    };

    setDraftForOrder(orderId, payload);
    state = {
      ...state,
      pendingOrderId: orderId
    };
    render();

    void updateAdminOrderStatus(orderId, payload).then(function (updatedOrder) {
      const normalizedFilter = normalizeEnumValue(state.filter);
      const updatedStatus = normalizeEnumValue(updatedOrder?.status);
      const shouldKeepItem = !normalizedFilter || normalizedFilter === updatedStatus;
      const nextDraftById = { ...state.draftById };
      const nextFeedbackById = { ...state.feedbackById };

      delete nextDraftById[orderId];

      if (!shouldKeepItem) {
        delete nextFeedbackById[orderId];
      } else {
        nextFeedbackById[orderId] = {
          type: 'success',
          message: 'Đã cập nhật trạng thái đơn hàng.'
        };
      }

      state = {
        ...state,
        pendingOrderId: '',
        selectedOrderId: shouldKeepItem ? orderId : '',
        items: shouldKeepItem
          ? state.items.map(function (item) {
            return normalizeText(item.id) === orderId ? { ...item, ...(updatedOrder || {}) } : item;
          })
          : state.items.filter(function (item) {
            return normalizeText(item.id) !== orderId;
          }),
        draftById: nextDraftById,
        feedbackById: nextFeedbackById
      };
      render();
    }).catch(function (error) {
      if (setPageStateFromError(error)) {
        return;
      }

      clearDraftForOrder(orderId);
      state = {
        ...state,
        pendingOrderId: '',
        feedbackById: {
          ...state.feedbackById,
          [orderId]: {
            type: 'error',
            message: error?.payload?.message || error?.message || 'Không thể lưu thay đổi lúc này.'
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

  bindKeyboard();
  bindFilter();
  bindSearch();
  bindActions();
  render();
  void loadOrders();
};
