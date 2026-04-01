import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { cancelOrder, getOrderById } from '../services/orders.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';
import {
  canCancelOrder,
  formatOrderDateTime,
  resolveOrderStatusLabel,
  resolvePaymentStatusLabel
} from './orders-shared.js';

let stopOrderDetailSubscription = null;
let latestOrderDetailKey = '';
let requestSequence = 0;
let actionsBound = false;
let detailState = {
  status: 'idle',
  orderId: '',
  viewerKey: '',
  order: null,
  pendingCancel: false,
  feedback: null
};

const getContainer = function () {
  return qs('[data-order-detail-content]');
};

const getRequestedOrderId = function () {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('id') || '').trim();
};

const shouldShowCreatedBanner = function () {
  const params = new URLSearchParams(window.location.search);
  return params.get('created') === '1';
};

const buildViewerKey = function (user) {
  return String(user?.id || user?.email || user?.name || '').trim();
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

const buildMultilineText = function (value, fallback = 'Chưa có') {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return escapeHTML(fallback);
  }

  return escapeHTML(normalizedValue).replace(/\n/g, '<br>');
};

const buildBookDetailUrl = function (item) {
  const handle = String(item?.bookHandle || '').trim();
  const bookId = String(item?.bookId || '').trim();

  if (!handle || !bookId) {
    return '';
  }

  const params = new URLSearchParams({
    handle,
    id: bookId
  });

  return `./book-detail.html?${params.toString()}`;
};

const buildActionFeedbackMarkup = function () {
  if (!detailState.feedback?.message) {
    return '';
  }

  return `
    <div class="form-message is-visible ${detailState.feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${detailState.feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(detailState.feedback.message)}
    </div>
  `;
};

const buildSuccessBannerMarkup = function (order) {
  if (!shouldShowCreatedBanner()) {
    return '';
  }

  const orderNumber = String(order?.orderNumber || '').trim();
  const successTitle = orderNumber
    ? `Đơn ${orderNumber} đã được ghi nhận`
    : 'Đơn hàng của bạn đã được ghi nhận';

  return `
    <article class="profile-card order-detail-success">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Đặt hàng thành công</p>
        <h2 class="profile-card__title">${escapeHTML(successTitle)}</h2>
        <p class="profile-card__text">Dzung9fBook sẽ xác nhận đơn COD của bạn trong bước xử lý tiếp theo. Bạn có thể xem lại toàn bộ thông tin đơn hàng ngay bên dưới.</p>
      </div>

      <div class="profile-card__actions">
        <a href="./orders.html" class="btn btn-primary">Xem tất cả đơn hàng</a>
        <a href="./books.html" class="btn btn-secondary">Tiếp tục chọn sách</a>
      </div>
    </article>
  `;
};

const buildOrderItemMarkup = function (item) {
  const bookLink = buildBookDetailUrl(item);

  return `
    <article class="profile-item order-detail-item">
      <div class="order-detail-item__header">
        <strong>${escapeHTML(item?.bookTitle || 'Tựa sách')}</strong>
        ${bookLink ? `<a href="${bookLink}" class="text-link">Xem sách</a>` : ''}
      </div>
      <div class="order-detail-item__meta">
        <span>Số lượng: ${escapeHTML(String(Number(item?.quantity || 0)))}</span>
        <span>Đơn giá: ${escapeHTML(formatPrice(item?.unitPrice || 0))}</span>
        <span>Thành tiền: ${escapeHTML(formatPrice(item?.lineTotal || 0))}</span>
      </div>
    </article>
  `;
};

const buildReadyMarkup = function (order) {
  const showCancelAction = canCancelOrder(order);

  return `
    ${buildSuccessBannerMarkup(order)}

    <div class="order-detail-layout">
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Chi tiết đơn hàng</p>
          <h2 class="profile-card__title">${escapeHTML(order?.orderNumber || 'Đơn hàng')}</h2>
          <p class="profile-card__text">Tạo lúc ${escapeHTML(formatOrderDateTime(order?.createdAt))}</p>
        </div>

        <dl class="profile-card__details">
          <div>
            <dt>Trạng thái đơn</dt>
            <dd>${escapeHTML(resolveOrderStatusLabel(order?.status))}</dd>
          </div>
          <div>
            <dt>Thanh toán</dt>
            <dd>${escapeHTML(resolvePaymentStatusLabel(order?.paymentStatus))}</dd>
          </div>
          <div>
            <dt>Người nhận</dt>
            <dd>${escapeHTML(order?.customerName || 'Chưa có')}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>${escapeHTML(order?.customerEmail || 'Chưa có')}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>${escapeHTML(order?.customerPhone || 'Chưa có')}</dd>
          </div>
          <div>
            <dt>Tổng thanh toán</dt>
            <dd>${escapeHTML(formatPrice(order?.totalAmount || 0))}</dd>
          </div>
          <div class="order-detail-panel order-detail-panel--wide">
            <dt>Địa chỉ giao hàng</dt>
            <dd>${buildMultilineText(order?.shippingAddress, 'Chưa có địa chỉ giao hàng')}</dd>
          </div>
          <div class="order-detail-panel order-detail-panel--wide">
            <dt>Ghi chú</dt>
            <dd>${buildMultilineText(order?.note, 'Không có ghi chú bổ sung')}</dd>
          </div>
        </dl>

        ${buildActionFeedbackMarkup()}

        <div class="profile-card__actions order-detail-actions">
          <a href="./orders.html" class="btn btn-primary">Xem tất cả đơn hàng</a>
          <a href="./profile.html" class="btn btn-secondary">Quay về hồ sơ</a>
          ${showCancelAction ? `
            <button
              type="button"
              class="btn btn-secondary order-detail-actions__cancel"
              data-order-detail-cancel-button
              ${detailState.pendingCancel ? 'disabled' : ''}
            >
              ${detailState.pendingCancel ? 'Đang hủy đơn...' : 'Hủy đơn'}
            </button>
          ` : ''}
        </div>
      </article>

      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Các đầu sách trong đơn</p>
          <h2 class="profile-card__title">Chi tiết sản phẩm</h2>
          <p class="profile-card__text">Giá và số lượng bên dưới là snapshot đã được lưu tại thời điểm tạo đơn.</p>
        </div>

        <div class="order-detail-items">
          ${(Array.isArray(order?.items) ? order.items : []).map(buildOrderItemMarkup).join('')}
        </div>

        <div class="order-detail-summary">
          <div class="summary-line">
            <span>Tổng cộng</span>
            <strong>${escapeHTML(formatPrice(order?.totalAmount || 0))}</strong>
          </div>
        </div>
      </article>
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
      'Chi tiết đơn hàng chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để lấy dữ liệu đơn hàng thật từ hệ thống.',
      '<a href="./orders.html" class="btn btn-secondary">Về danh sách đơn hàng</a>'
    );
    return;
  }

  if (session.authStatus === 'loading' && !currentUser) {
    container.innerHTML = buildStateMarkup(
      'Đang kiểm tra phiên đăng nhập',
      'Chúng mình đang đồng bộ tài khoản để xác định đơn hàng bạn cần xem.'
    );
    return;
  }

  if (!currentUser || detailState.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập để xem chi tiết đơn hàng của tài khoản này.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (detailState.status === 'loading' || detailState.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải chi tiết đơn hàng',
      'Chúng mình đang đồng bộ thông tin đơn hàng mới nhất cho bạn.'
    );
    return;
  }

  if (detailState.status === 'not-found') {
    container.innerHTML = buildStateMarkup(
      'Không tìm thấy đơn hàng',
      'Đơn hàng này không tồn tại hoặc không thuộc về tài khoản hiện tại.',
      '<a href="./orders.html" class="btn btn-secondary">Về danh sách đơn hàng</a>'
    );
    return;
  }

  if (detailState.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải chi tiết đơn hàng',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang sau ít phút.',
      '<a href="./orders.html" class="btn btn-secondary">Về danh sách đơn hàng</a>'
    );
    return;
  }

  container.innerHTML = buildReadyMarkup(detailState.order || {});
};

const loadOrderDetail = async function (viewerKey, orderId) {
  const nextRequestSequence = requestSequence + 1;
  requestSequence = nextRequestSequence;
  detailState = {
    status: 'loading',
    viewerKey,
    orderId,
    order: null,
    pendingCancel: false,
    feedback: null
  };
  render();

  try {
    const order = await getOrderById(orderId);

    if (nextRequestSequence !== requestSequence) {
      return;
    }

    detailState = {
      status: 'ready',
      viewerKey,
      orderId,
      order,
      pendingCancel: false,
      feedback: null
    };
  } catch (error) {
    if (nextRequestSequence !== requestSequence) {
      return;
    }

    detailState = {
      status: error?.status === 401 ? 'unauthorized' : error?.status === 404 ? 'not-found' : 'error',
      viewerKey,
      orderId,
      order: null,
      pendingCancel: false,
      feedback: null
    };
    console.error(error);
  }

  render();
};

const syncOrderDetail = function () {
  const currentUser = getSessionSnapshot().currentUser;
  const viewerKey = buildViewerKey(currentUser);
  const orderId = getRequestedOrderId();

  if (!viewerKey) {
    latestOrderDetailKey = '';
    requestSequence += 1;
    detailState = {
      status: 'idle',
      viewerKey: '',
      orderId: '',
      order: null,
      pendingCancel: false,
      feedback: null
    };
    render();
    return;
  }

  if (!orderId) {
    detailState = {
      status: 'not-found',
      viewerKey,
      orderId: '',
      order: null,
      pendingCancel: false,
      feedback: null
    };
    latestOrderDetailKey = `${viewerKey}::missing`;
    render();
    return;
  }

  const nextLoadKey = `${viewerKey}::${orderId}`;

  if (nextLoadKey === latestOrderDetailKey && detailState.status !== 'idle') {
    render();
    return;
  }

  latestOrderDetailKey = nextLoadKey;
  void loadOrderDetail(viewerKey, orderId);
};

const bindActions = function () {
  const container = getContainer();

  if (!container || actionsBound) {
    return;
  }

  actionsBound = true;

  container.addEventListener('click', function (event) {
    const cancelButton = event.target.closest('[data-order-detail-cancel-button]');

    if (!cancelButton || detailState.pendingCancel || !canCancelOrder(detailState.order)) {
      return;
    }

    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) {
      return;
    }

    detailState = {
      ...detailState,
      pendingCancel: true,
      feedback: null
    };
    render();

    void cancelOrder(detailState.orderId).then(function (order) {
      detailState = {
        ...detailState,
        order: order || detailState.order,
        pendingCancel: false,
        feedback: {
          type: 'success',
          message: 'Đơn hàng đã được hủy thành công.'
        }
      };
      render();
    }).catch(async function (error) {
      if (error?.status === 404) {
        detailState = {
          ...detailState,
          status: 'not-found',
          pendingCancel: false,
          order: null,
          feedback: null
        };
        render();
        console.error(error);
        return;
      }

      let nextOrder = detailState.order;

      if (error?.status === 409) {
        try {
          nextOrder = await getOrderById(detailState.orderId);
        } catch (refreshError) {
          if (refreshError?.status === 404) {
            detailState = {
              ...detailState,
              status: 'not-found',
              pendingCancel: false,
              order: null,
              feedback: null
            };
            render();
            console.error(refreshError);
            return;
          }

          console.error(refreshError);
        }
      }

      detailState = {
        ...detailState,
        pendingCancel: false,
        order: nextOrder,
        feedback: {
          type: 'error',
          message: error?.payload?.message || error?.message || 'Không thể hủy đơn hàng lúc này.'
        }
      };
      render();
      console.error(error);
    });
  });
};

export const initOrderDetailPage = function () {
  if (!getContainer()) {
    return;
  }

  if (typeof stopOrderDetailSubscription === 'function') {
    stopOrderDetailSubscription();
  }

  bindActions();

  stopOrderDetailSubscription = subscribeSessionStore(function () {
    syncOrderDetail();
  });
};
