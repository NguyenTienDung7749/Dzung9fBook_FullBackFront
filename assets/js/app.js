import { qsa } from './core/dom.js';
import { attachGlobalActions } from './core/global-actions.js';
import { initCurrentPage } from './core/page-init.js';
import { reportRuntimeError } from './core/runtime-notice.js';
import { bootstrapSession } from './services/auth.js';
import { getCategories } from './services/catalog.js';
import { syncCartSummary } from './services/cart.js';
import { subscribeSessionStore } from './state/session-store.js';
import { initCategoryAccordions, initCategoryBrowsers } from './ui/catalog-ui.js';
import { initNavbar, initStickyHeader, renderAuthShell, renderFooterCategories, renderMobileCategoryNavs, setActiveNav, syncSearchInputs } from './ui/shell.js';

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
  await initCurrentPage(categories).catch((error) => {
    reportRuntimeError('Trang đang gặp lỗi khi tải dữ liệu. Vui lòng thử tải lại sau ít phút.', error);
  });
  await Promise.allSettled([sessionPromise, cartPromise]);
};

init().catch((error) => {
  reportRuntimeError('Đã xảy ra lỗi khi khởi động trang. Vui lòng tải lại để thử lại.', error);
});
