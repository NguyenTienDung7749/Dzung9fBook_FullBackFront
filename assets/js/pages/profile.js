import { qs } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { buildBooksUrl } from '../data/catalog.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';

let categoriesCache = [];
let stopProfileSubscription = null;

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
    return;
  }

  container.innerHTML = `
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
  `;
};

export const initProfilePage = function (categories) {
  categoriesCache = categories;

  if (typeof stopProfileSubscription === 'function') {
    stopProfileSubscription();
  }

  stopProfileSubscription = subscribeSessionStore(function () {
    renderProfilePage();
  });
};
