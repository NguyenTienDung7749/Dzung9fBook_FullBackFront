import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { buildBooksUrl } from '../data/catalog.js';
import { getOrders } from '../services/orders.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';

let categoriesCache = [];
let stopProfileSubscription = null;
let latestProfileKey = '';
let ordersRequestSequence = 0;
let ordersState = {
  status: 'idle',
  profileKey: '',
  items: [],
  error: null
};

const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

const formatOrderDate = function (value) {
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

const buildOrderDetailUrl = function (orderId) {
  const normalizedOrderId = String(orderId || '').trim();
  return normalizedOrderId
    ? `./order-detail.html?id=${encodeURIComponent(normalizedOrderId)}`
    : './profile.html';
};

const buildProfileKey = function (user) {
  return String(user?.id || user?.email || user?.name || '').trim();
};

const resetOrdersState = function () {
  ordersState = {
    status: 'idle',
    profileKey: '',
    items: [],
    error: null
  };
};

const renderAnonymousState = function (container) {
  container.innerHTML = `
    <div class="empty-state empty-state--profile">
      <h2>Bạn chưa đăng nhập</h2>
      <p>Đăng nhập để lưu thông tin liên hệ, theo dõi giỏ sách và mua sắm thuận tiện hơn trong lần ghé tiếp theo.</p>
      <div class="empty-state__actions">
        <a href="./login.html" class="btn btn-primary">Đăng nhập</a>
        <a href="./register.html" class="btn btn-secondary">Tạo tài khoản</a>
      </div>
    </div>
  `;
};

const buildOrderHistoryMarkup = function () {
  if (ordersState.status === 'loading' || ordersState.status === 'idle') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Chúng mình đang đồng bộ danh sách đơn hàng mới nhất cho tài khoản của bạn.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'unsupported') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Lịch sử đơn hàng hiện chỉ hỗ trợ khi trang đang kết nối với backend/API mode.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'error') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Tạm thời chưa thể tải lịch sử đơn hàng. Vui lòng tải lại trang hoặc thử lại sau ít phút.</p>
        </div>
      </article>
    `;
  }

  if (!ordersState.items.length) {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Bạn chưa có đơn hàng nào. Khi đặt hàng COD thành công, danh sách sẽ hiện ở đây.</p>
        </div>
      </article>
    `;
  }

  const listMarkup = ordersState.items.map(function (order) {
    return `
      <div class="profile-item">
        <strong>${escapeHTML(order.orderNumber || 'Don hang')}</strong>
        <p class="profile-card__text">Ngày tạo: ${escapeHTML(formatOrderDate(order.createdAt))}</p>
        <p class="profile-card__text">Trạng thái: ${escapeHTML(resolveOrderStatusLabel(order.status))}</p>
        <p class="profile-card__text">Số lượng sách: ${escapeHTML(String(Number(order.itemCount || 0)))}</p>
        <p class="profile-card__text">Tổng tạm tính: ${escapeHTML(formatPrice(order.totalAmount || 0))}</p>
        <div class="profile-item__actions">
          <a href="${buildOrderDetailUrl(order.id)}" class="btn btn-secondary">Xem chi tiết</a>
        </div>
      </div>
    `;
  }).join('');

  return `
      <article class="profile-card">
        <div class="profile-card__header">
        <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
        <h2 class="profile-card__title">Đơn hàng gần đây</h2>
        <p class="profile-card__text">Danh sách được sắp xếp theo thứ tự mới nhất trước để bạn dễ theo dõi.</p>
        </div>

      <div class="profile-grid">
        ${listMarkup}
      </div>
    </article>
  `;
};

export const renderProfilePage = function () {
  const container = qs('[data-profile-content]');

  if (!container) {
    return;
  }

  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (session.authStatus === 'loading' && !currentUser) {
    container.innerHTML = `
      <div class="empty-state empty-state--profile">
        <h2>Đang tải tài khoản</h2>
        <p>Chúng mình đang kiểm tra phiên đăng nhập hiện tại để hiển thị đúng thông tin của bạn.</p>
      </div>
    `;
    return;
  }

  if (!currentUser) {
    renderAnonymousState(container);
    return;
  }

  container.innerHTML = `
    <div class="profile-grid">
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Tài khoản Dzung9fBook</p>
          <h2 class="profile-card__title">${escapeHTML(currentUser.name)}</h2>
          <p class="profile-card__text">Thông tin này được dùng để cá nhân hóa trải nghiệm mua sách và giữ liên lạc khi bạn cần hỗ trợ.</p>
        </div>

        <dl class="profile-card__details">
          <div>
            <dt>Họ và tên</dt>
            <dd>${escapeHTML(currentUser.name)}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>${escapeHTML(currentUser.email)}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>${escapeHTML(currentUser.phone || 'Chưa cập nhật')}</dd>
          </div>
        </dl>

        <div class="profile-card__actions">
          <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">Tiếp tục chọn sách</a>
          <button type="button" class="btn btn-primary" data-logout-button>Đăng xuất</button>
        </div>
      </article>

      ${buildOrderHistoryMarkup()}
    </div>
  `;
};

const loadOrdersForCurrentUser = async function (profileKey) {
  const requestId = ordersRequestSequence + 1;
  ordersRequestSequence = requestId;
  ordersState = {
    status: isApiProviderMode() ? 'loading' : 'unsupported',
    profileKey,
    items: [],
    error: null
  };
  renderProfilePage();

  if (!isApiProviderMode()) {
    return;
  }

  try {
    const items = await getOrders();

    if (requestId !== ordersRequestSequence) {
      return;
    }

    ordersState = {
      status: 'ready',
      profileKey,
      items: Array.isArray(items) ? items : [],
      error: null
    };
  } catch (error) {
    if (requestId !== ordersRequestSequence) {
      return;
    }

    ordersState = {
      status: error?.code === 'ORDERS_UNSUPPORTED' || error?.status === 501 ? 'unsupported' : 'error',
      profileKey,
      items: [],
      error
    };
    console.error(error);
  }

  renderProfilePage();
};

const syncProfileOrders = function () {
  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!currentUser) {
    latestProfileKey = '';
    ordersRequestSequence += 1;
    resetOrdersState();
    renderProfilePage();
    return;
  }

  const profileKey = buildProfileKey(currentUser);

  if (!profileKey) {
    renderProfilePage();
    return;
  }

  if (profileKey === latestProfileKey && ordersState.profileKey === profileKey && ordersState.status !== 'idle') {
    renderProfilePage();
    return;
  }

  latestProfileKey = profileKey;
  void loadOrdersForCurrentUser(profileKey);
};

export const initProfilePage = function (categories) {
  categoriesCache = categories;

  if (typeof stopProfileSubscription === 'function') {
    stopProfileSubscription();
  }

  stopProfileSubscription = subscribeSessionStore(function () {
    syncProfileOrders();
  });
};
