import { qs, qsa } from './core/dom.js';
import { escapeHTML } from './core/utils.js';
import { getCategories } from './services/catalog.js';
import { bootstrapSession, logout } from './services/auth.js';
import { addItem, removeItem, syncCartSummary, updateItemQuantity } from './services/cart.js';
import { subscribeSessionStore } from './state/session-store.js';
import { initCategoryAccordions, initCategoryBrowsers } from './ui/catalog-ui.js';
import { initNavbar, initStickyHeader, renderAuthShell, renderFooterCategories, renderMobileCategoryNavs, setActiveNav, syncSearchInputs } from './ui/shell.js';
import { initBooksPage } from './pages/books.js';
import { initBookDetailPage } from './pages/book-detail.js';
import { initCartPage, renderCartPage } from './pages/cart.js';
import { initLoginPage } from './pages/login.js';
import { initRegisterPage } from './pages/register.js';
import { initContactPage } from './pages/contact.js';
import { initProfilePage } from './pages/profile.js';
import { initOrderDetailPage } from './pages/order-detail.js';
import { initAdminBooksPage } from './pages/admin-books.js';
import { initAdminOrdersPage } from './pages/admin-orders.js';
import { initAdminMessagesPage } from './pages/admin-messages.js';

const showSiteNotice = function (type, message) {
  const notice = qs('[data-site-notice]');

  if (!notice) {
    return;
  }

  notice.hidden = false;
  notice.className = `site-notice is-${type}`;
  notice.innerHTML = `
    <div class="container site-notice__inner">
      <p class="site-notice__text">${escapeHTML(message)}</p>
    </div>
  `;
};

const reportRuntimeError = function (message, error) {
  showSiteNotice('error', message);
  console.error(error);
};

const updateCartBadge = function (snapshot) {
  const totalItems = Number(snapshot?.cartCount || 0);

  qsa('[data-cart-count]').forEach((badge) => {
    badge.textContent = String(totalItems);
  });
};

const bindShellState = function () {
  subscribeSessionStore((snapshot) => {
    updateCartBadge(snapshot);
    renderAuthShell(snapshot);
    setActiveNav();
  });
};

const flashAddButton = function (button) {
  const originalLabel = button.textContent.trim();
  button.textContent = 'Đã thêm vào giỏ';
  button.disabled = true;
  button.classList.add('is-added');

  window.setTimeout(function () {
    button.textContent = originalLabel;
    button.disabled = false;
    button.classList.remove('is-added');
  }, 1200);
};

const handleCartMutation = async function (mutate, options = {}) {
  await mutate();

  if (options.redirectToCart) {
    window.location.href = './cart.html';
    return;
  }

  if (options.flashButton) {
    flashAddButton(options.flashButton);
  }

  if (document.body.dataset.page === 'cart') {
    await renderCartPage();
  }
};

const attachGlobalActions = function () {
  document.addEventListener('click', function (event) {
    const buyNowButton = event.target.closest('[data-buy-now]');

    if (buyNowButton) {
      void handleCartMutation(function () {
        return addItem(buyNowButton.dataset.bookId, buyNowButton.dataset.bookHandle);
      }, {
        redirectToCart: true
      }).catch(function (error) {
        reportRuntimeError('Không thể cập nhật giỏ sách lúc này. Vui lòng thử lại sau ít phút.', error);
      });
      return;
    }

    const addButton = event.target.closest('[data-add-to-cart]');

    if (addButton) {
      void handleCartMutation(function () {
        return addItem(addButton.dataset.bookId, addButton.dataset.bookHandle);
      }, {
        flashButton: addButton
      }).catch(function (error) {
        reportRuntimeError('Không thể thêm sách vào giỏ lúc này. Vui lòng thử lại sau.', error);
      });
      return;
    }

    const cartActionButton = event.target.closest('[data-cart-action]');

    if (cartActionButton) {
      const bookId = cartActionButton.dataset.bookId;
      const action = cartActionButton.dataset.cartAction;

      void handleCartMutation(async function () {
        if (action === 'increase') {
          await updateItemQuantity(bookId, 1);
        }

        if (action === 'decrease') {
          await updateItemQuantity(bookId, -1);
        }

        if (action === 'remove') {
          await removeItem(bookId);
        }
      }).catch(function (error) {
        reportRuntimeError('Không thể cập nhật giỏ sách lúc này. Vui lòng tải lại trang rồi thử lại.', error);
      });
      return;
    }

    if (event.target.closest('[data-logout-button]')) {
      void logout().catch(function (error) {
        reportRuntimeError('Không thể đăng xuất lúc này. Vui lòng thử lại sau.', error);
      });
    }
  });
};

const initPage = async function (categories) {
  const currentPage = document.body.dataset.page;
  const layout = document.body.dataset.layout || '';

  if (currentPage === 'books' && layout === 'book-detail') {
    await initBookDetailPage(categories);
  }

  if (currentPage === 'books' && layout !== 'book-detail') {
    await initBooksPage(categories);
  }

  if (currentPage === 'cart') {
    await initCartPage(categories);
  }

  if (currentPage === 'login') {
    initLoginPage();
  }

  if (currentPage === 'register') {
    initRegisterPage();
  }

  if (currentPage === 'contact') {
    initContactPage();
  }

  if (currentPage === 'profile') {
    initProfilePage(categories);
  }

  if (currentPage === 'order-detail') {
    initOrderDetailPage();
  }

  if (currentPage === 'admin-orders') {
    initAdminOrdersPage();
  }

  if (currentPage === 'admin-messages') {
    initAdminMessagesPage();
  }

  if (currentPage === 'admin-books') {
    initAdminBooksPage();
  }
};

const init = async function () {
  bindShellState();
  attachGlobalActions();

  const sessionPromise = bootstrapSession().catch((error) => {
    reportRuntimeError('Không thể đồng bộ phiên đăng nhập lúc này. Bạn vẫn có thể tiếp tục duyệt sách.', error);
    return null;
  });
  const cartPromise = syncCartSummary().catch((error) => {
    reportRuntimeError('Không thể đồng bộ giỏ sách lúc này. Một số cập nhật có thể chưa hiển thị đầy đủ.', error);
    return [];
  });
  let categories = [];

  try {
    categories = await getCategories();
  } catch (error) {
    reportRuntimeError('Không thể tải danh mục sách lúc này. Một số khối nội dung có thể chưa hiển thị đầy đủ.', error);
  }
  const isBooksPage = document.body.dataset.page === 'books' && document.body.dataset.layout !== 'book-detail';

  renderFooterCategories(categories);
  renderMobileCategoryNavs(categories, {
    preserveQuery: isBooksPage
  });
  syncSearchInputs();
  initNavbar();
  initStickyHeader();
  initCategoryBrowsers();
  initCategoryAccordions();
  await initPage(categories).catch((error) => {
    reportRuntimeError('Trang đang gặp lỗi khi tải dữ liệu. Vui lòng thử tải lại sau ít phút.', error);
  });
  await Promise.allSettled([sessionPromise, cartPromise]);
};

init().catch((error) => {
  reportRuntimeError('Đã xảy ra lỗi khi khởi động trang. Vui lòng tải lại để thử lại.', error);
});
