import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { buildBooksUrl } from '../data/catalog.js';
import { cancelOrder, getOrders } from '../services/orders.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';
import {
  buildOrderDetailUrl,
  canCancelOrder,
  formatOrderDateTime,
  resolveOrderStatusLabel,
  resolvePaymentStatusLabel
} from './orders-shared.js';

let categoriesCache = [];
let stopOrdersSubscription = null;
let latestViewerKey = '';
let requestSequence = 0;
let actionsBound = false;
let ordersPageState = {
  status: 'idle',
  viewerKey: '',
  items: [],
  pendingOrderId: '',
  feedbackById: {}
};

const getContainer = function () {
  return qs('[data-orders-content]');
};

const buildViewerKey = function (user) {
  return String(user?.id || user?.email || user?.name || '').trim();
};

const resetOrdersPageState = function () {
  ordersPageState = {
    status: 'idle',
    viewerKey: '',
    items: [],
    pendingOrderId: '',
    feedbackById: {}
  };
};

const buildStateMarkup = function (title, description, actionsMarkup = '') {
  return `
    <div class="empty-state">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionsMarkup ? `<div class="empty-state__actions">${actionsMarkup}</div>` : ''}
    </div>
  `;
};

const buildFeedbackMarkup = function (orderId) {
  const feedback = ordersPageState.feedbackById?.[orderId];

  if (!feedback?.message) {
    return '';
  }

  return `
    <div class="form-message is-visible ${feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(feedback.message)}
    </div>
  `;
};

const buildOrderCardMarkup = function (order) {
  const normalizedOrderId = String(order?.id || '').trim();
  const isCancelling = ordersPageState.pendingOrderId === normalizedOrderId;

  return `
    <article class="profile-card orders-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Đơn hàng của bạn</p>
        <h2 class="profile-card__title">${escapeHTML(order?.orderNumber || 'Đơn hàng')}</h2>
        <p class="profile-card__text">Tạo lúc ${escapeHTML(formatOrderDateTime(order?.createdAt))}</p>
      </div>

      <dl class="orders-card__meta">
        <div class="orders-card__meta-item">
          <dt>Trạng thái đơn</dt>
          <dd>${escapeHTML(resolveOrderStatusLabel(order?.status))}</dd>
        </div>
        <div class="orders-card__meta-item">
          <dt>Thanh toán</dt>
          <dd>${escapeHTML(resolvePaymentStatusLabel(order?.paymentStatus))}</dd>
        </div>
        <div class="orders-card__meta-item">
          <dt>Số đầu sách</dt>
          <dd>${escapeHTML(String(Number(order?.itemCount || 0)))}</dd>
        </div>
        <div class="orders-card__meta-item">
          <dt>Tổng thanh toán</dt>
          <dd>${escapeHTML(formatPrice(order?.totalAmount || 0))}</dd>
        </div>
      </dl>

      ${buildFeedbackMarkup(normalizedOrderId)}

      <div class="profile-card__actions orders-card__actions">
        <a href="${buildOrderDetailUrl(normalizedOrderId)}" class="btn btn-primary">Xem chi tiết</a>
        ${canCancelOrder(order) ? `
          <button
            type="button"
            class="btn btn-secondary orders-card__cancel-button"
            data-order-cancel-button
            data-order-id="${escapeHTML(normalizedOrderId)}"
            ${isCancelling ? 'disabled' : ''}
          >
            ${isCancelling ? 'Đang hủy đơn...' : 'Hủy đơn'}
          </button>
        ` : ''}
      </div>
    </article>
  `;
};

const buildReadyMarkup = function () {
  const items = Array.isArray(ordersPageState.items) ? ordersPageState.items : [];

  if (!items.length) {
    return buildStateMarkup(
      'Bạn chưa có đơn hàng nào',
      'Khi bạn hoàn tất đặt hàng, danh sách đơn sẽ xuất hiện tại đây để bạn theo dõi trạng thái xử lý.',
      `
        <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-primary">Khám phá sách</a>
        <a href="./profile.html" class="btn btn-secondary">Quay về hồ sơ</a>
      `
    );
  }

  return `
    <div class="orders-page__summary">
      <p class="orders-page__summary-text">Bạn đang có ${escapeHTML(String(items.length))} đơn hàng được lưu trong tài khoản này.</p>
      <div class="empty-state__actions">
        <a href="./profile.html" class="btn btn-secondary">Quay về hồ sơ</a>
      </div>
    </div>

    <div class="orders-list">
      ${items.map(buildOrderCardMarkup).join('')}
    </div>
  `;
};

const render = function () {
  const container = getContainer();

  if (!container) {
    return;
  }

  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!isApiProviderMode()) {
    container.innerHTML = buildStateMarkup(
      'Lịch sử đơn hàng chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để tải danh sách đơn hàng thực từ hệ thống.',
      '<a href="./profile.html" class="btn btn-secondary">Quay về hồ sơ</a>'
    );
    return;
  }

  if (session.authStatus === 'loading' && !currentUser) {
    container.innerHTML = buildStateMarkup(
      'Đang kiểm tra phiên đăng nhập',
      'Chúng mình đang đồng bộ tài khoản hiện tại trước khi tải danh sách đơn hàng của bạn.'
    );
    return;
  }

  if (!currentUser || ordersPageState.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập để xem toàn bộ đơn hàng đã gắn với tài khoản của bạn.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (ordersPageState.status === 'loading' || ordersPageState.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách đơn hàng',
      'Chúng mình đang lấy dữ liệu đơn hàng mới nhất để bạn theo dõi thuận tiện hơn.'
    );
    return;
  }

  if (ordersPageState.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải danh sách đơn hàng',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại hoặc quay lại sau ít phút.',
      `
        <button type="button" class="btn btn-primary" data-orders-retry-button>Thử tải lại</button>
        <a href="./profile.html" class="btn btn-secondary">Quay về hồ sơ</a>
      `
    );
    return;
  }

  container.innerHTML = buildReadyMarkup();
};

const loadOrdersPage = async function (viewerKey) {
  const currentRequestId = requestSequence + 1;
  requestSequence = currentRequestId;
  ordersPageState = {
    status: 'loading',
    viewerKey,
    items: [],
    pendingOrderId: '',
    feedbackById: {}
  };
  render();

  try {
    const items = await getOrders();

    if (currentRequestId !== requestSequence) {
      return;
    }

    ordersPageState = {
      status: 'ready',
      viewerKey,
      items: Array.isArray(items) ? items : [],
      pendingOrderId: '',
      feedbackById: {}
    };
  } catch (error) {
    if (currentRequestId !== requestSequence) {
      return;
    }

    ordersPageState = {
      status: error?.status === 401 ? 'unauthorized' : 'error',
      viewerKey,
      items: [],
      pendingOrderId: '',
      feedbackById: {}
    };
    console.error(error);
  }

  render();
};

const syncOrdersPage = function () {
  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!currentUser) {
    latestViewerKey = '';
    requestSequence += 1;
    resetOrdersPageState();
    render();
    return;
  }

  const viewerKey = buildViewerKey(currentUser);

  if (!viewerKey) {
    render();
    return;
  }

  if (viewerKey === latestViewerKey && ordersPageState.viewerKey === viewerKey && ordersPageState.status !== 'idle') {
    render();
    return;
  }

  latestViewerKey = viewerKey;
  void loadOrdersPage(viewerKey);
};

const refreshOrdersAfterConflict = async function () {
  try {
    const items = await getOrders();
    return Array.isArray(items) ? items : [];
  } catch (refreshError) {
    console.error(refreshError);
    return Array.isArray(ordersPageState.items) ? ordersPageState.items : [];
  }
};

const bindActions = function () {
  const container = getContainer();

  if (!container || actionsBound) {
    return;
  }

  actionsBound = true;

  container.addEventListener('click', function (event) {
    const retryButton = event.target.closest('[data-orders-retry-button]');

    if (retryButton) {
      const currentUser = getSessionSnapshot().currentUser;
      const viewerKey = buildViewerKey(currentUser);

      if (viewerKey) {
        void loadOrdersPage(viewerKey);
      }
      return;
    }

    const cancelButton = event.target.closest('[data-order-cancel-button]');

    if (!cancelButton) {
      return;
    }

    const orderId = String(cancelButton.dataset.orderId || '').trim();
    const targetOrder = (Array.isArray(ordersPageState.items) ? ordersPageState.items : []).find(function (order) {
      return String(order?.id || '').trim() === orderId;
    });

    if (!orderId || !targetOrder || !canCancelOrder(targetOrder) || ordersPageState.pendingOrderId) {
      return;
    }

    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) {
      return;
    }

    ordersPageState = {
      ...ordersPageState,
      pendingOrderId: orderId,
      feedbackById: {
        ...ordersPageState.feedbackById,
        [orderId]: null
      }
    };
    render();

    void cancelOrder(orderId).then(async function (order) {
      const updatedItems = (Array.isArray(ordersPageState.items) ? ordersPageState.items : []).map(function (item) {
        if (String(item?.id || '').trim() !== orderId) {
          return item;
        }

        return {
          ...item,
          status: order?.status || item.status,
          paymentStatus: order?.paymentStatus || item.paymentStatus,
          totalAmount: Number.isFinite(Number(order?.totalAmount)) ? Number(order.totalAmount) : item.totalAmount,
          createdAt: order?.createdAt || item.createdAt,
          canCancel: Boolean(order?.canCancel)
        };
      });

      ordersPageState = {
        ...ordersPageState,
        items: updatedItems,
        pendingOrderId: '',
        feedbackById: {
          ...ordersPageState.feedbackById,
          [orderId]: {
            type: 'success',
            message: 'Đơn hàng đã được hủy thành công.'
          }
        }
      };
      render();
    }).catch(async function (error) {
      const nextItems = (error?.status === 404 || error?.status === 409)
        ? await refreshOrdersAfterConflict()
        : (Array.isArray(ordersPageState.items) ? ordersPageState.items : []);

      ordersPageState = {
        ...ordersPageState,
        items: nextItems,
        pendingOrderId: '',
        feedbackById: {
          ...ordersPageState.feedbackById,
          [orderId]: {
            type: 'error',
            message: error?.payload?.message || error?.message || 'Không thể hủy đơn hàng lúc này.'
          }
        }
      };
      render();
      console.error(error);
    });
  });
};

export const initOrdersPage = function (categories) {
  if (!getContainer()) {
    return;
  }

  categoriesCache = Array.isArray(categories) ? categories : [];

  if (typeof stopOrdersSubscription === 'function') {
    stopOrdersSubscription();
  }

  bindActions();

  stopOrdersSubscription = subscribeSessionStore(function () {
    syncOrdersPage();
  });
};
