import { qs, qsa } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import {
  buildDetailUrl,
  getBookDisplayAuthor,
  getBookParentSlug,
  getBookPrimaryImage,
  getBookSubcategorySlug
} from '../data/catalog.js';
import { getDetailedCart, syncCartSummary } from '../services/cart.js';
import { checkout } from '../services/orders.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';
import { isValidPhone } from './forms-shared.js';

let categoriesCache = [];
let renderSequence = 0;
let latestCartItems = [];
let unsubscribeCartSession = null;
let checkoutPageActionsBound = false;
let checkoutModalKeyboardBound = false;
let checkoutModalTimer = null;

const CHECKOUT_ISSUE_MESSAGES = {
  SOLD_OUT: 'Tựa sách này hiện đã hết hàng. Vui lòng xóa khỏi giỏ để tiếp tục checkout.',
  INSUFFICIENT_STOCK: 'Số lượng trong giỏ đang vượt quá tồn kho hiện có.',
  UNAVAILABLE: 'Tựa sách này không còn hợp lệ để đặt hàng. Vui lòng xóa khỏi giỏ hoặc chọn tựa khác.'
};

const createCheckoutDraft = function (snapshot = getSessionSnapshot()) {
  return {
    customerPhone: String(snapshot?.currentUser?.phone || '').trim(),
    shippingAddress: '',
    note: ''
  };
};

const createEmptyFieldErrors = function () {
  return {
    customerPhone: '',
    shippingAddress: '',
    note: ''
  };
};

const createCheckoutModalState = function () {
  return {
    isOpen: false,
    mode: '',
    step: 'idle',
    pending: false,
    draft: createCheckoutDraft(),
    fieldErrors: createEmptyFieldErrors(),
    feedback: null,
    countdownEndsAt: 0,
    countdownSeconds: 10
  };
};

let checkoutModalState = createCheckoutModalState();

const renderCartState = function (container, title, description, actionsMarkup = '') {
  container.innerHTML = `
    <div class="empty-state empty-state--catalog">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionsMarkup ? `<div class="empty-state__actions">${actionsMarkup}</div>` : ''}
    </div>
  `;
};

const getCheckoutPanel = function () {
  return qs('[data-checkout-panel]');
};

const getCheckoutModalRoot = function () {
  return qs('[data-checkout-modal-root]');
};

const setCartItemCount = function (value) {
  const nextValue = String(Math.max(0, Number(value) || 0));

  qsa('[data-cart-item-count]').forEach(function (element) {
    element.textContent = nextValue;
  });
};

const clearCheckoutPanel = function () {
  const panel = getCheckoutPanel();

  if (panel) {
    panel.innerHTML = '';
  }
};

const clearCheckoutIssueHints = function () {
  qsa('.cart-item__issue').forEach(function (issue) {
    issue.remove();
  });
};

const clearCheckoutDemoTimer = function () {
  if (checkoutModalTimer) {
    window.clearInterval(checkoutModalTimer);
    checkoutModalTimer = null;
  }
};

const syncBodyCheckoutModalState = function () {
  document.body.classList.toggle('checkout-modal-open', checkoutModalState.isOpen);
};

const resolveCheckoutIssueMessage = function (issue) {
  if (issue?.reason === 'INSUFFICIENT_STOCK' && Number.isFinite(Number(issue?.availableQuantity))) {
    return `Tựa sách này chỉ còn ${Number(issue.availableQuantity)} bản khả dụng. Vui lòng giảm số lượng hoặc xóa khỏi giỏ.`;
  }

  return CHECKOUT_ISSUE_MESSAGES[String(issue?.reason || '').trim().toUpperCase()]
    || 'Tựa sách này đang gặp vấn đề tồn kho. Vui lòng kiểm tra lại giỏ hàng.';
};

const renderCheckoutIssueHints = function (issues = []) {
  clearCheckoutIssueHints();

  (Array.isArray(issues) ? issues : []).forEach(function (issue) {
    const normalizedBookId = String(issue?.bookId || '').trim();

    if (!normalizedBookId) {
      return;
    }

    const itemElement = qs(`[data-cart-item][data-book-id="${normalizedBookId}"]`);

    if (!itemElement) {
      return;
    }

    const detailsElement = qs('.cart-item__details', itemElement);

    if (!detailsElement) {
      return;
    }

    const issueElement = document.createElement('p');
    issueElement.className = 'cart-item__issue';
    issueElement.textContent = resolveCheckoutIssueMessage(issue);
    detailsElement.append(issueElement);
  });
};

const closeCheckoutModal = function () {
  clearCheckoutDemoTimer();
  checkoutModalState = createCheckoutModalState();
  syncBodyCheckoutModalState();
  renderCheckoutModal();
};

const renderEmptyCart = function (container, totalElement) {
  renderCartState(
    container,
    'Giỏ sách của bạn đang trống',
    'Khám phá thêm vài tựa sách phù hợp và lưu chúng lại để tiếp tục đọc bất cứ lúc nào.',
    '<a href="./books.html" class="btn btn-primary">Tiếp tục chọn sách</a>'
  );

  if (totalElement) {
    totalElement.textContent = formatPrice(0);
  }

  setCartItemCount(0);
  clearCheckoutIssueHints();
  clearCheckoutPanel();
  closeCheckoutModal();
};

const buildCheckoutMethodLabel = function (mode) {
  return mode === 'ONLINE_DEMO' ? 'Thanh toán online DEMO' : 'Đặt hàng COD';
};

const buildCheckoutButtonLabel = function (mode, isPending) {
  if (isPending) {
    return 'Đang tạo đơn hàng...';
  }

  return mode === 'ONLINE_DEMO' ? 'Xác nhận địa chỉ' : 'Đặt hàng COD';
};

const buildCheckoutRailMarkup = function () {
  return `
    <div class="cart-checkout-rail">
      <div class="cart-checkout-rail__actions">
        <button type="button" class="btn btn-primary btn-block" data-open-checkout-modal data-payment-mode="ONLINE_DEMO">
          Thanh toán online
        </button>
        <button type="button" class="btn btn-secondary btn-block" data-open-checkout-modal data-payment-mode="COD">
          Đặt hàng COD
        </button>
      </div>
    </div>
  `;
};

const getCartTotalAmount = function () {
  return latestCartItems.reduce(function (sum, item) {
    if (!item?.book) {
      return sum;
    }

    return sum + (Number(item.book.price) * Number(item.quantity || 0));
  }, 0);
};

const normalizeCheckoutMode = function (value) {
  return String(value || '').trim().toUpperCase() === 'ONLINE_DEMO' ? 'ONLINE_DEMO' : 'COD';
};

const startCheckoutDemoCountdown = function () {
  clearCheckoutDemoTimer();

  if (!checkoutModalState.isOpen || checkoutModalState.mode !== 'ONLINE_DEMO' || checkoutModalState.step !== 'qr') {
    return;
  }

  const syncCountdown = function () {
    if (!checkoutModalState.isOpen || checkoutModalState.mode !== 'ONLINE_DEMO' || checkoutModalState.step !== 'qr') {
      clearCheckoutDemoTimer();
      return;
    }

    const nextSeconds = Math.max(0, Math.ceil((checkoutModalState.countdownEndsAt - Date.now()) / 1000));

    if (nextSeconds !== checkoutModalState.countdownSeconds) {
      checkoutModalState = {
        ...checkoutModalState,
        countdownSeconds: nextSeconds
      };
      renderCheckoutModal();
    }

    if (nextSeconds <= 0) {
      clearCheckoutDemoTimer();
      checkoutModalState = {
        ...checkoutModalState,
        step: 'form',
        countdownSeconds: 0,
        feedback: null
      };
      renderCheckoutModal();
    }
  };

  syncCountdown();
  checkoutModalTimer = window.setInterval(syncCountdown, 250);
};

const openCheckoutModal = function (mode) {
  if (!latestCartItems.length) {
    return;
  }

  const normalizedMode = normalizeCheckoutMode(mode);

  clearCheckoutDemoTimer();
  checkoutModalState = {
    isOpen: true,
    mode: normalizedMode,
    step: normalizedMode === 'ONLINE_DEMO' ? 'qr' : 'form',
    pending: false,
    draft: createCheckoutDraft(),
    fieldErrors: createEmptyFieldErrors(),
    feedback: null,
    countdownEndsAt: normalizedMode === 'ONLINE_DEMO' ? Date.now() + 10000 : 0,
    countdownSeconds: 10
  };

  syncBodyCheckoutModalState();
  renderCheckoutModal();

  if (normalizedMode === 'ONLINE_DEMO') {
    startCheckoutDemoCountdown();
  }
};

const renderCheckoutPanel = function (cartWithBooks = latestCartItems) {
  const panel = getCheckoutPanel();

  if (!panel) {
    return;
  }

  if (!Array.isArray(cartWithBooks) || cartWithBooks.length === 0) {
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = buildCheckoutRailMarkup();
};

const buildMissingItemMarkup = function (item) {
  const normalizedBookId = escapeHTML(String(item.bookId));

  return `
    <article class="cart-item cart-item--missing" data-cart-item data-book-id="${normalizedBookId}">
      <div class="cart-item__media cart-item__media--missing" aria-hidden="true">
        <span class="cart-item__missing-label">Không còn ảnh bìa</span>
      </div>

      <div class="cart-item__details">
        <div class="cart-item__head">
          <div class="cart-item__copy">
            <p class="cart-item__eyebrow">Cần kiểm tra lại</p>
            <h2 class="cart-item__title">Tựa sách không còn trong danh mục</h2>
            <p class="cart-item__meta">Mã sách #${normalizedBookId}</p>
            <p class="cart-item__meta">Sản phẩm này có thể đã được cập nhật hoặc gỡ khỏi catalog hiện tại.</p>
          </div>

          <div class="cart-item__unit-price">
            <span>Đơn giá</span>
            <strong>${formatPrice(0)}</strong>
          </div>
        </div>

        <div class="cart-item__footer">
          <div class="cart-item__quantity">
            <span class="cart-item__footer-label">Số lượng</span>
            <div class="quantity-control quantity-control--static" aria-label="Số lượng hiện tại">
              <span>${item.quantity}</span>
            </div>
          </div>

          <div class="cart-item__pricing">
            <span class="cart-item__footer-label">Thành tiền</span>
            <p class="cart-item__total">${formatPrice(0)}</p>
          </div>

          <button type="button" class="cart-item__remove" data-cart-action="remove" data-book-id="${normalizedBookId}">
            Xóa khỏi giỏ
          </button>
        </div>
      </div>
    </article>
  `;
};

const buildBookMeta = function (book) {
  const metaParts = [];
  const author = String(getBookDisplayAuthor(book) || '').trim();
  const categoryLabel = String(book?.categoryLabel || '').trim();

  if (author) {
    metaParts.push(escapeHTML(author));
  }

  if (categoryLabel) {
    metaParts.push(escapeHTML(categoryLabel));
  }

  if (!metaParts.length) {
    return 'Ấn phẩm được chọn cho đơn hàng này.';
  }

  return metaParts.join(' · ');
};

const buildCartItemMarkup = function (item) {
  const book = item.book;
  const lineTotal = Number(book.price) * item.quantity;
  const detailUrl = buildDetailUrl(categoriesCache, book, {
    category: getBookParentSlug(categoriesCache, book),
    subcategory: getBookSubcategorySlug(book)
  });
  const eyebrow = escapeHTML(String(book.subcategoryLabel || book.categoryLabel || 'Dzung9fBook'));

  return `
    <article class="cart-item" data-cart-item data-book-id="${escapeHTML(String(book.id))}">
      <div class="cart-item__media">
        <img src="${escapeHTML(getBookPrimaryImage(book))}" alt="${escapeHTML(book.title)}" class="cart-item__image" loading="lazy" decoding="async">
      </div>

      <div class="cart-item__details">
        <div class="cart-item__head">
          <div class="cart-item__copy">
            <p class="cart-item__eyebrow">${eyebrow}</p>
            <h2 class="cart-item__title">${escapeHTML(book.title)}</h2>
            <p class="cart-item__meta">${buildBookMeta(book)}</p>
            <a href="${escapeHTML(detailUrl)}" class="cart-item__detail-link text-link">Xem chi tiết sách</a>
          </div>

          <div class="cart-item__unit-price">
            <span>Đơn giá</span>
            <strong>${formatPrice(book.price)}</strong>
          </div>
        </div>

        <div class="cart-item__footer">
          <div class="cart-item__quantity">
            <span class="cart-item__footer-label">Số lượng</span>
            <div class="quantity-control">
              <button type="button" class="quantity-btn" data-cart-action="decrease" data-book-id="${book.id}" aria-label="Giảm số lượng">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="quantity-btn" data-cart-action="increase" data-book-id="${book.id}" aria-label="Tăng số lượng">+</button>
            </div>
          </div>

          <div class="cart-item__pricing">
            <span class="cart-item__footer-label">Thành tiền</span>
            <p class="cart-item__total">${formatPrice(lineTotal)}</p>
          </div>

          <button type="button" class="cart-item__remove" data-cart-action="remove" data-book-id="${book.id}">
            Xóa khỏi giỏ
          </button>
        </div>
      </div>
    </article>
  `;
};

const buildModalFeedbackMarkup = function () {
  if (!checkoutModalState.feedback?.message) {
    return '<div class="form-message checkout-modal__form-message"></div>';
  }

  return `
    <div class="form-message checkout-modal__form-message is-visible ${checkoutModalState.feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${checkoutModalState.feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(checkoutModalState.feedback.message)}
    </div>
  `;
};

const buildCheckoutInfoRowsMarkup = function (snapshot = getSessionSnapshot()) {
  const currentUser = snapshot?.currentUser || null;

  return `
    <dl class="checkout-modal__account" aria-label="Thông tin tài khoản dùng để tạo đơn hàng">
      <div class="checkout-modal__account-item">
        <dt>Người nhận</dt>
        <dd>${escapeHTML(String(currentUser?.name || '').trim() || 'Chưa cập nhật')}</dd>
      </div>
      <div class="checkout-modal__account-item">
        <dt>Email</dt>
        <dd>${escapeHTML(String(currentUser?.email || '').trim() || 'Chưa cập nhật')}</dd>
      </div>
    </dl>
  `;
};

const buildModalSummaryCardMarkup = function () {
  return `
    <div class="checkout-modal__summary-card">
      <div class="checkout-modal__summary-line">
        <span>Tổng thanh toán</span>
        <strong>${escapeHTML(formatPrice(getCartTotalAmount()))}</strong>
      </div>
      <p class="checkout-modal__summary-note">${escapeHTML(String(latestCartItems.length))} tựa sách trong đơn hàng hiện tại.</p>
    </div>
  `;
};

const buildDemoQrMarkup = function () {
  return `
    <div class="checkout-demo-qr" aria-hidden="true">
      <div class="checkout-demo-qr__finder checkout-demo-qr__finder--top-left"></div>
      <div class="checkout-demo-qr__finder checkout-demo-qr__finder--top-right"></div>
      <div class="checkout-demo-qr__finder checkout-demo-qr__finder--bottom-left"></div>
      <div class="checkout-demo-qr__noise checkout-demo-qr__noise--one"></div>
      <div class="checkout-demo-qr__noise checkout-demo-qr__noise--two"></div>
      <div class="checkout-demo-qr__noise checkout-demo-qr__noise--three"></div>
      <div class="checkout-demo-qr__noise checkout-demo-qr__noise--four"></div>
      <div class="checkout-demo-qr__noise checkout-demo-qr__noise--five"></div>
      <span class="checkout-demo-qr__label">QR DEMO</span>
    </div>
  `;
};

const buildModalNoticeMarkup = function (title, description, actionsMarkup = '') {
  return `
    <div class="checkout-modal__notice">
      <h3>${title}</h3>
      <p>${description}</p>
      ${actionsMarkup ? `<div class="checkout-modal__notice-actions">${actionsMarkup}</div>` : ''}
    </div>
  `;
};

const buildCheckoutFormMarkup = function () {
  const isOnlineMode = checkoutModalState.mode === 'ONLINE_DEMO';
  const draft = checkoutModalState.draft || createCheckoutDraft();
  const fieldErrors = checkoutModalState.fieldErrors || createEmptyFieldErrors();
  const phoneValue = escapeHTML(String(draft.customerPhone || ''));
  const addressValue = escapeHTML(String(draft.shippingAddress || ''));
  const noteValue = escapeHTML(String(draft.note || ''));

  return `
    <div class="checkout-modal__stack">
      ${buildModalSummaryCardMarkup()}

      ${isOnlineMode ? `
        <div class="checkout-modal__success">
          <p class="checkout-modal__success-eyebrow">Đã xác nhận DEMO</p>
          <h3>Thanh toán demo thành công</h3>
          <p>Đây là bước mô phỏng, không có giao dịch ngân hàng thật nào được thực hiện. Tiếp tục nhập thông tin giao nhận để tạo đơn hàng có trạng thái đã thanh toán.</p>
        </div>
      ` : ''}

      <div class="checkout-modal__form-shell">
        <div class="checkout-modal__form-intro">
          <p class="checkout-modal__form-eyebrow">${escapeHTML(buildCheckoutMethodLabel(checkoutModalState.mode))}</p>
          <h3>${isOnlineMode ? 'Hoàn tất thông tin giao nhận' : 'Xác nhận đơn COD'}</h3>
          <p>${isOnlineMode
            ? 'Thông tin dưới đây sẽ được gắn vào đơn hàng sau khi bước thanh toán demo đã hoàn tất.'
            : 'Chỉ cần số điện thoại và địa chỉ giao hàng để staff xác nhận đơn trong bước tiếp theo.'}</p>
        </div>

        ${buildCheckoutInfoRowsMarkup()}

        <form class="checkout-modal__form" data-checkout-form novalidate>
          <label class="form-field">
            <span class="label-text">Số điện thoại</span>
            <input
              type="tel"
              name="customerPhone"
              placeholder="0983 376 932"
              value="${phoneValue}"
              ${checkoutModalState.pending ? 'disabled' : ''}
              autocomplete="tel"
              inputmode="tel"
              class="${fieldErrors.customerPhone ? 'input-invalid' : ''}"
            >
            <span class="field-error" data-error-for="customerPhone">${escapeHTML(fieldErrors.customerPhone || '')}</span>
          </label>

          <label class="form-field">
            <span class="label-text">Địa chỉ giao hàng</span>
            <textarea
              name="shippingAddress"
              rows="3"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              ${checkoutModalState.pending ? 'disabled' : ''}
              autocomplete="street-address"
              class="${fieldErrors.shippingAddress ? 'input-invalid' : ''}"
            >${addressValue}</textarea>
            <span class="field-error" data-error-for="shippingAddress">${escapeHTML(fieldErrors.shippingAddress || '')}</span>
          </label>

          <label class="form-field">
            <span class="label-text">Ghi chú</span>
            <textarea
              name="note"
              rows="2"
              placeholder="Ví dụ: Gọi trước khi giao, giao giờ hành chính..."
              ${checkoutModalState.pending ? 'disabled' : ''}
            >${noteValue}</textarea>
            <span class="field-error" data-error-for="note">${escapeHTML(fieldErrors.note || '')}</span>
          </label>

          <div class="checkout-modal__form-footer">
            ${buildModalFeedbackMarkup()}

            <div class="checkout-modal__form-actions">
              <button class="btn btn-primary btn-block" type="submit" data-checkout-submit ${checkoutModalState.pending ? 'disabled' : ''}>
                ${escapeHTML(buildCheckoutButtonLabel(checkoutModalState.mode, checkoutModalState.pending))}
              </button>
              <button class="btn btn-secondary btn-block" type="button" data-close-checkout-modal ${checkoutModalState.pending ? 'disabled' : ''}>
                Đóng
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
};

const buildOnlineDemoMarkup = function () {
  return `
    <div class="checkout-modal__stack">
      ${buildModalSummaryCardMarkup()}

      <div class="checkout-modal__demo">
        <div class="checkout-modal__demo-header">
          <div>
            <p class="checkout-modal__form-eyebrow">Thanh toán online DEMO</p>
            <h3>Quét QR giả lập để tiếp tục</h3>
          </div>
          <span class="checkout-modal__demo-badge">DEMO</span>
        </div>

        <p class="checkout-modal__demo-text">Không có cổng thanh toán thật nào được kết nối. Sau 10 giây, hệ thống sẽ tự chuyển sang trạng thái thanh toán thành công để bạn tiếp tục nhập địa chỉ giao hàng.</p>

        <div class="checkout-modal__demo-grid">
          ${buildDemoQrMarkup()}

          <div class="checkout-modal__demo-details">
            <dl class="checkout-modal__account checkout-modal__account--stacked">
              <div class="checkout-modal__account-item">
                <dt>Ngân hàng demo</dt>
                <dd>Vietcombank</dd>
              </div>
              <div class="checkout-modal__account-item">
                <dt>Số tài khoản</dt>
                <dd>1020 8899 0000</dd>
              </div>
              <div class="checkout-modal__account-item">
                <dt>Thụ hưởng</dt>
                <dd>Dzung9fBook DEMO</dd>
              </div>
              <div class="checkout-modal__account-item">
                <dt>Số tiền</dt>
                <dd>${escapeHTML(formatPrice(getCartTotalAmount()))}</dd>
              </div>
            </dl>

            <div class="checkout-modal__countdown" role="status" aria-live="polite">
              <strong>${escapeHTML(String(checkoutModalState.countdownSeconds || 0))} giây</strong>
              <span>Tự động chuyển sang bước tiếp theo</span>
            </div>

            <p class="checkout-modal__demo-note">DEMO, không phải thanh toán thật. Vui lòng không chuyển khoản ngoài đời thực theo thông tin này.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const buildCheckoutModalContentMarkup = function (snapshot = getSessionSnapshot()) {
  if (!isApiProviderMode()) {
    return buildModalNoticeMarkup(
      'Checkout chỉ hỗ trợ khi chạy backend',
      'Trang hiện đang ở static mode nên chưa thể tạo đơn hàng thật từ giỏ sách.',
      '<a href="./contact.html" class="btn btn-secondary">Để lại thông tin liên hệ</a>'
    );
  }

  if (snapshot?.authStatus === 'loading' || snapshot?.authStatus === 'idle') {
    return buildModalNoticeMarkup(
      'Đang đồng bộ phiên đăng nhập',
      'Chúng mình đang kiểm tra tài khoản hiện tại trước khi mở bước checkout tương ứng.'
    );
  }

  if (!snapshot?.currentUser) {
    return buildModalNoticeMarkup(
      'Bạn cần đăng nhập',
      'Đăng nhập để tạo đơn hàng và lưu lịch sử mua sách vào đúng tài khoản của bạn.',
      `
        <a href="./login.html" class="btn btn-primary">Đăng nhập</a>
        <a href="./register.html" class="btn btn-secondary">Tạo tài khoản</a>
      `
    );
  }

  if (checkoutModalState.mode === 'ONLINE_DEMO' && checkoutModalState.step === 'qr') {
    return buildOnlineDemoMarkup();
  }

  return buildCheckoutFormMarkup();
};

const renderCheckoutModal = function (snapshot = getSessionSnapshot()) {
  const root = getCheckoutModalRoot();

  if (!root) {
    return;
  }

  if (!checkoutModalState.isOpen) {
    root.innerHTML = '';
    syncBodyCheckoutModalState();
    return;
  }

  root.innerHTML = `
    <div class="checkout-modal" data-checkout-modal>
      <button
        class="checkout-modal__backdrop"
        type="button"
        data-close-checkout-modal
        aria-label="Đóng cửa sổ checkout"
        ${checkoutModalState.pending ? 'disabled' : ''}
      ></button>

      <div class="checkout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
        <div class="checkout-modal__topbar">
          <div class="checkout-modal__heading">
            <p class="checkout-modal__eyebrow">Checkout từ giỏ hàng</p>
            <h2 class="checkout-modal__title" id="checkout-modal-title">${escapeHTML(buildCheckoutMethodLabel(checkoutModalState.mode))}</h2>
          </div>

          <button
            class="checkout-modal__close"
            type="button"
            data-close-checkout-modal
            data-checkout-modal-close
            aria-label="Đóng popup checkout"
            ${checkoutModalState.pending ? 'disabled' : ''}
          >
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>

        <div class="checkout-modal__content">
          ${buildCheckoutModalContentMarkup(snapshot)}
        </div>
      </div>
    </div>
  `;

  syncBodyCheckoutModalState();
};

const validateCheckoutDraft = function () {
  const draft = checkoutModalState.draft || createCheckoutDraft();
  const nextErrors = createEmptyFieldErrors();

  if (!draft.customerPhone) {
    nextErrors.customerPhone = 'Vui lòng nhập số điện thoại.';
  } else if (!isValidPhone(draft.customerPhone)) {
    nextErrors.customerPhone = 'Số điện thoại cần có từ 9 đến 11 chữ số hợp lệ.';
  }

  if (!draft.shippingAddress) {
    nextErrors.shippingAddress = 'Vui lòng nhập địa chỉ giao hàng.';
  }

  return nextErrors;
};

const hasCheckoutFieldErrors = function (fieldErrors) {
  return Object.values(fieldErrors || {}).some(Boolean);
};

const submitCheckoutForm = async function () {
  const fieldErrors = validateCheckoutDraft();

  if (hasCheckoutFieldErrors(fieldErrors)) {
    checkoutModalState = {
      ...checkoutModalState,
      fieldErrors,
      feedback: {
        type: 'error',
        message: 'Vui lòng điền đầy đủ thông tin giao hàng.'
      }
    };
    renderCheckoutModal();
    return;
  }

  checkoutModalState = {
    ...checkoutModalState,
    pending: true,
    fieldErrors: createEmptyFieldErrors(),
    feedback: null
  };
  renderCheckoutModal();

  try {
    const draft = checkoutModalState.draft || createCheckoutDraft();
    const checkoutResult = await checkout({
      customerPhone: String(draft.customerPhone || '').trim(),
      shippingAddress: String(draft.shippingAddress || '').trim(),
      ...(String(draft.note || '').trim() ? { note: String(draft.note || '').trim() } : {}),
      paymentMode: checkoutModalState.mode === 'ONLINE_DEMO' ? 'ONLINE_DEMO' : 'COD'
    });
    await syncCartSummary();
    const orderId = String(checkoutResult?.order?.id || '').trim();
    window.location.href = orderId
      ? `./order-detail.html?id=${encodeURIComponent(orderId)}&created=1`
      : './profile.html';
  } catch (error) {
    const checkoutIssues = Array.isArray(error?.payload?.details?.issues)
      ? error.payload.details.issues
      : [];

    if (error?.payload?.code === 'CHECKOUT_INVENTORY_CONFLICT' && checkoutIssues.length > 0) {
      renderCheckoutIssueHints(checkoutIssues);
    }

    checkoutModalState = {
      ...checkoutModalState,
      pending: false,
      feedback: {
        type: 'error',
        message: error?.payload?.message || error?.message || 'Không thể đặt hàng lúc này. Vui lòng thử lại sau.'
      }
    };
    renderCheckoutModal();
    console.error(error);
  }
};

const handleCheckoutModalInput = function (field, value) {
  checkoutModalState = {
    ...checkoutModalState,
    draft: {
      ...checkoutModalState.draft,
      [field]: value
    },
    fieldErrors: {
      ...checkoutModalState.fieldErrors,
      [field]: ''
    },
    feedback: null
  };
};

const bindCheckoutModalDocumentEvents = function () {
  if (checkoutModalKeyboardBound) {
    return;
  }

  checkoutModalKeyboardBound = true;

  document.addEventListener('keydown', function (event) {
    if (!checkoutModalState.isOpen || checkoutModalState.pending) {
      return;
    }

    if (event.key === 'Escape') {
      closeCheckoutModal();
    }
  });
};

const bindCheckoutPageActions = function () {
  if (checkoutPageActionsBound) {
    return;
  }

  checkoutPageActionsBound = true;

  document.addEventListener('click', function (event) {
    if (document.body.dataset.page !== 'cart') {
      return;
    }

    const openButton = event.target.closest('[data-open-checkout-modal]');

    if (openButton) {
      openCheckoutModal(openButton.dataset.paymentMode);
      return;
    }

    const closeButton = event.target.closest('[data-close-checkout-modal]');

    if (closeButton && checkoutModalState.isOpen && !checkoutModalState.pending) {
      closeCheckoutModal();
    }
  });

  document.addEventListener('input', function (event) {
    if (!checkoutModalState.isOpen) {
      return;
    }

    const form = event.target.closest('[data-checkout-form]');

    if (!form) {
      return;
    }

    const fieldName = String(event.target.name || '').trim();

    if (!fieldName || !(fieldName in checkoutModalState.draft)) {
      return;
    }

    handleCheckoutModalInput(fieldName, event.target.value);

    const errorElement = qs(`[data-error-for="${fieldName}"]`, form);
    const messageElement = qs('[data-form-message]', form);

    if (errorElement) {
      errorElement.textContent = '';
    }

    event.target.classList.remove('input-invalid');

    if (messageElement) {
      messageElement.textContent = '';
      messageElement.className = 'form-message checkout-modal__form-message';
      messageElement.removeAttribute('role');
    }
  });

  document.addEventListener('submit', function (event) {
    if (!checkoutModalState.isOpen) {
      return;
    }

    const form = event.target.closest('[data-checkout-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    if (checkoutModalState.pending) {
      return;
    }

    checkoutModalState = {
      ...checkoutModalState,
      draft: {
        customerPhone: String(form.elements.customerPhone?.value || '').trim(),
        shippingAddress: String(form.elements.shippingAddress?.value || '').trim(),
        note: String(form.elements.note?.value || '').trim()
      },
      fieldErrors: createEmptyFieldErrors(),
      feedback: null
    };

    void submitCheckoutForm();
  });
};

export const renderCartPage = async function () {
  const container = qs('[data-cart-items]');

  if (!container) {
    return;
  }

  const totalElement = qs('[data-cart-total]');
  const renderId = renderSequence + 1;
  renderSequence = renderId;
  latestCartItems = [];
  clearCheckoutPanel();
  clearCheckoutIssueHints();
  setCartItemCount(0);

  if (totalElement) {
    totalElement.textContent = formatPrice(0);
  }

  renderCartState(
    container,
    'Đang tải giỏ sách',
    'Chúng mình đang lấy thông tin mới nhất cho các tựa sách bạn đã chọn.'
  );

  let cartWithBooks;

  try {
    cartWithBooks = await getDetailedCart();
  } catch (error) {
    if (renderId !== renderSequence) {
      return;
    }

    renderCartState(
      container,
      'Không thể tải giỏ sách',
      'Dữ liệu giỏ sách đang tạm thời chưa phản hồi. Vui lòng thử tải lại trang hoặc quay về trang sách.',
      `
        <a href="./cart.html" class="btn btn-primary">Thử tải lại</a>
        <a href="./books.html" class="btn btn-secondary">Quay về trang sách</a>
      `
    );

    if (totalElement) {
      totalElement.textContent = formatPrice(0);
    }

    setCartItemCount(0);
    clearCheckoutPanel();
    closeCheckoutModal();
    console.error(error);
    return;
  }

  if (renderId !== renderSequence) {
    return;
  }

  if (!cartWithBooks.length) {
    latestCartItems = [];
    renderEmptyCart(container, totalElement);
    return;
  }

  let grandTotal = 0;

  const cartMarkup = cartWithBooks.map(function (item) {
    const book = item.book;

    if (!book) {
      return buildMissingItemMarkup(item);
    }

    grandTotal += Number(book.price) * item.quantity;
    return buildCartItemMarkup(item);
  }).join('');

  container.innerHTML = `<div class="cart-list">${cartMarkup}</div>`;
  latestCartItems = cartWithBooks;
  setCartItemCount(cartWithBooks.length);

  if (totalElement) {
    totalElement.textContent = formatPrice(grandTotal);
  }

  renderCheckoutPanel(cartWithBooks);
  renderCheckoutModal();
};

export const initCartPage = async function (categories) {
  const container = qs('[data-cart-items]');

  if (!container) {
    return;
  }

  categoriesCache = categories;
  bindCheckoutPageActions();
  bindCheckoutModalDocumentEvents();

  if (typeof unsubscribeCartSession === 'function') {
    unsubscribeCartSession();
  }

  unsubscribeCartSession = subscribeSessionStore(function (snapshot) {
    if (!latestCartItems.length && checkoutModalState.isOpen) {
      closeCheckoutModal();
      return;
    }

    if (checkoutModalState.isOpen) {
      if (checkoutModalState.mode === 'ONLINE_DEMO' && checkoutModalState.step === 'qr') {
        startCheckoutDemoCountdown();
      }

      renderCheckoutModal(snapshot);
    }

    renderCheckoutPanel(latestCartItems);
  });

  await renderCartPage();
};
