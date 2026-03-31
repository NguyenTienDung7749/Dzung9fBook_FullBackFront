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

let state = {
  status: 'idle',
  filter: '',
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

const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
};

const resolvePaymentStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return PAYMENT_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Không rõ';
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

const buildOrderCardMarkup = function (order) {
  const orderId = String(order?.id || '').trim();
  const isPending = state.pendingOrderId === orderId;
  const feedback = state.feedbackById[orderId] || null;

  return `
    <article class="profile-card admin-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(resolveOrderStatusLabel(order.status))}</p>
        <h2 class="profile-card__title">${escapeHTML(order.orderNumber || 'Đơn hàng')}</h2>
        <p class="profile-card__text">Tạo lúc ${escapeHTML(formatDateTime(order.createdAt))}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>Khách hàng</dt>
          <dd>${escapeHTML(order.customerName || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Email</dt>
          <dd>${escapeHTML(order.customerEmail || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Số điện thoại</dt>
          <dd>${escapeHTML(order.customerPhone || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Trạng thái thanh toán</dt>
          <dd>${escapeHTML(resolvePaymentStatusLabel(order.paymentStatus))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Tổng tiền</dt>
          <dd>${escapeHTML(formatPrice(order.totalAmount || 0))}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Số lượng sách</dt>
          <dd>${escapeHTML(String(Number(order.itemCount || 0)))}</dd>
        </div>
      </dl>

      <form class="admin-status-form" data-admin-order-form data-order-id="${escapeHTML(orderId)}">
        <div class="admin-status-form__grid">
          <label class="form-field">
            <span class="label-text">Trạng thái đơn hàng</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(ORDER_STATUS_OPTIONS, order.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Trạng thái thanh toán</span>
            <select name="paymentStatus" ${isPending ? 'disabled' : ''}>
              ${buildOptionsMarkup(PAYMENT_STATUS_OPTIONS, order.paymentStatus)}
            </select>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu'}
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
      'Admin UI chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để tải và cập nhật dữ liệu quản trị.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách đơn hàng',
      'Chúng mình đang đồng bộ dữ liệu đơn hàng mới nhất từ backend.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản staff/admin để truy cập khu vực quản trị đơn hàng.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm staff/admin nên không thể dùng trang quản trị này.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải đơn hàng',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin-orders.html" class="btn btn-primary">Thử tải lại</a>'
    );
    return;
  }

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chưa có đơn hàng phù hợp',
      state.filter
        ? 'Không có đơn hàng nào khớp với bộ lọc trạng thái hiện tại.'
        : 'Danh sách đơn hàng hiện đang trống.'
    );
    return;
  }

  container.innerHTML = `
    <div class="admin-list">
      ${state.items.map(buildOrderCardMarkup).join('')}
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
            message: 'Đã cập nhật trạng thái đơn hàng.'
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

  bindFilter();
  bindActions();
  render();
  void loadOrders();
};
