import { qs } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminMe } from '../services/admin.js';

let state = {
  status: 'idle',
  currentUser: null
};

const getContent = function () {
  return qs('[data-admin-home-content]');
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

const buildHubCardMarkup = function (eyebrow, title, description, href, actionLabel) {
  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(eyebrow)}</p>
        <h2 class="profile-card__title">${escapeHTML(title)}</h2>
        <p class="profile-card__text">${escapeHTML(description)}</p>
      </div>

      <div class="profile-card__actions">
        <a href="${href}" class="btn btn-primary">${escapeHTML(actionLabel)}</a>
      </div>
    </article>
  `;
};

const buildReadyMarkup = function () {
  const displayName = escapeHTML(String(state.currentUser?.name || 'Staff/Admin'));

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Khu quản trị</p>
        <h2 class="profile-card__title">Xin chào, ${displayName}</h2>
        <p class="profile-card__text">Chọn nhanh khu vực cần xử lý để theo dõi đơn hàng, cập nhật tồn kho hoặc phản hồi các tin nhắn liên hệ.</p>
      </div>
    </article>

    <div class="profile-grid">
      ${buildHubCardMarkup(
        'Đơn hàng',
        'Quản lý đơn hàng',
        'Theo dõi các đơn mới tạo và cập nhật trạng thái xử lý ngay trên trang.',
        './admin-orders.html',
        'Mở đơn hàng'
      )}
      ${buildHubCardMarkup(
        'Tồn kho',
        'Quản lý tồn kho sách',
        'Cập nhật nhanh trạng thái còn hàng hoặc hết hàng cho từng tựa sách trong DB.',
        './admin-books.html',
        'Mở tồn kho'
      )}
      ${buildHubCardMarkup(
        'Liên hệ',
        'Xử lý tin nhắn hỗ trợ',
        'Theo dõi các yêu cầu liên hệ mới và để lại ghi chú nội bộ cho staff/admin.',
        './admin-messages.html',
        'Mở tin nhắn'
      )}
    </div>
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
      'Trang này cần API mode để kiểm tra quyền staff/admin và tải các lối vào khu quản trị.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang kiểm tra quyền truy cập',
      'Chúng mình đang xác nhận tài khoản hiện tại có thuộc nhóm staff/admin hay không.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản staff/admin để truy cập khu quản trị.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm staff/admin nên không thể dùng khu quản trị.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    return;
  }

  if (state.status === 'unsupported') {
    container.innerHTML = buildStateMarkup(
      'Admin UI chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để kiểm tra quyền staff/admin và tải các lối vào khu quản trị.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải khu quản trị',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin.html" class="btn btn-primary">Thử tải lại</a>'
    );
    return;
  }

  container.innerHTML = buildReadyMarkup();
};

const loadAdminHome = async function () {
  state = {
    status: 'loading',
    currentUser: null
  };
  render();

  try {
    const currentUser = await getAdminMe();
    state = {
      status: 'ready',
      currentUser
    };
  } catch (error) {
    if (error?.status === 401) {
      state = {
        status: 'unauthorized',
        currentUser: null
      };
      render();
      return;
    }

    if (error?.status === 403) {
      state = {
        status: 'forbidden',
        currentUser: null
      };
      render();
      return;
    }

    state = {
      status: error?.code === 'ADMIN_UNSUPPORTED' || error?.status === 501 ? 'unsupported' : 'error',
      currentUser: null
    };
    console.error(error);
  }

  render();
};

export const initAdminHomePage = function () {
  if (!getContent()) {
    return;
  }

  render();
  void loadAdminHome();
};
