import { qs, qsa } from '../core/dom.js';
import { formatPrice, escapeHTML } from '../core/utils.js';
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
import { attachFieldClearHandlers, clearFormState, setFieldError, showFormMessage } from './forms-shared.js';

let categoriesCache = [];
let renderSequence = 0;
let latestCartItems = [];
let unsubscribeCartSession = null;
const CHECKOUT_ISSUE_MESSAGES = {
  SOLD_OUT: 'Tựa sách này hiện đã hết hàng. Vui lòng xóa khỏi giỏ để tiếp tục checkout.',
  INSUFFICIENT_STOCK: 'Số lượng trong giỏ đang vượt quá tồn kho hiện có.',
  UNAVAILABLE: 'Tựa sách này không còn hợp lệ để đặt hàng. Vui lòng xóa khỏi giỏ hoặc chọn tựa khác.'
};

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

const getCartItemCountElement = function () {
  return qs('[data-cart-item-count]');
};

const setCartItemCount = function (value) {
  const countElement = getCartItemCountElement();

  if (!countElement) {
    return;
  }

  countElement.textContent = String(Math.max(0, Number(value) || 0));
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
};

const buildCheckoutMessageMarkup = function (message, actionMarkup = '') {
  return `
    <div class="cart-checkout-card cart-checkout-card--notice">
      <div class="cart-checkout-card__intro">
        <p class="cart-checkout-card__eyebrow">Trạng thái checkout</p>
        <p class="summary-note">${message}</p>
      </div>
      ${actionMarkup ? `<div class="cart-checkout-card__actions">${actionMarkup}</div>` : ''}
    </div>
  `;
};

const buildCheckoutFormMarkup = function (currentUser) {
  const displayName = escapeHTML(String(currentUser?.name || '').trim() || 'Chưa cập nhật');
  const displayEmail = escapeHTML(String(currentUser?.email || '').trim() || 'Chưa cập nhật');
  const displayPhone = escapeHTML(String(currentUser?.phone || ''));

  return `
    <div class="cart-checkout-card">
      <div class="cart-checkout-card__intro">
        <p class="cart-checkout-card__eyebrow">Thông tin giao nhận</p>
        <p class="summary-note">Đơn hàng sẽ được xác nhận thủ công sau khi bạn gửi thông tin giao nhận.</p>
      </div>

      <dl class="cart-checkout-account" aria-label="Thông tin tài khoản dùng để tạo đơn hàng">
        <div class="cart-checkout-account__item">
          <dt>Người nhận</dt>
          <dd>${displayName}</dd>
        </div>
        <div class="cart-checkout-account__item">
          <dt>Email</dt>
          <dd>${displayEmail}</dd>
        </div>
      </dl>

      <form class="cart-checkout-form" data-checkout-form novalidate>
        <label class="form-field">
          <span class="label-text">Số điện thoại</span>
          <input
            type="tel"
            name="customerPhone"
            placeholder="0983 376 932"
            value="${displayPhone}"
            required
            autocomplete="tel"
            inputmode="tel"
          >
          <span class="field-error" id="checkout-phone-error" data-error-for="customerPhone"></span>
        </label>

        <label class="form-field">
          <span class="label-text">Địa chỉ giao hàng</span>
          <textarea
            name="shippingAddress"
            rows="4"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            required
            autocomplete="street-address"
          ></textarea>
          <span class="field-error" id="checkout-address-error" data-error-for="shippingAddress"></span>
        </label>

        <label class="form-field">
          <span class="label-text">Ghi chú</span>
          <textarea
            name="note"
            rows="3"
            placeholder="Ví dụ: Gọi trước khi giao, giao giờ hành chính..."
          ></textarea>
          <span class="field-error" id="checkout-note-error" data-error-for="note"></span>
        </label>

        <div class="cart-checkout-form__actions">
          <div class="form-message" data-form-message aria-live="polite"></div>
          <button class="btn btn-primary btn-block" type="submit" data-checkout-submit>Đặt hàng COD</button>
        </div>
      </form>
    </div>
  `;
};

const bindCheckoutForm = function (form) {
  if (!form) {
    return;
  }

  attachFieldClearHandlers(form);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearFormState(form);
    clearCheckoutIssueHints();

    const submitButton = qs('[data-checkout-submit]', form);
    const customerPhone = String(form.elements.customerPhone?.value || '').trim();
    const shippingAddress = String(form.elements.shippingAddress?.value || '').trim();
    const note = String(form.elements.note?.value || '').trim();
    let hasErrors = false;

    if (!customerPhone) {
      setFieldError(form, 'customerPhone', 'Vui lòng nhập số điện thoại.');
      hasErrors = true;
    }

    if (!shippingAddress) {
      setFieldError(form, 'shippingAddress', 'Vui lòng nhập địa chỉ giao hàng.');
      hasErrors = true;
    }

    if (hasErrors) {
      showFormMessage(form, 'error', 'Vui lòng điền đầy đủ thông tin giao hàng.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = 'Đang tạo đơn hàng...';
    }

    try {
      const checkoutResult = await checkout({
        customerPhone,
        shippingAddress,
        ...(note ? { note } : {})
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

      showFormMessage(
        form,
        'error',
        error?.payload?.message || error?.message || 'Không thể đặt hàng lúc này. Vui lòng thử lại sau.'
      );
      console.error(error);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalLabel || 'Đặt hàng COD';
      }
    }
  });
};

const renderCheckoutPanel = function (cartWithBooks = latestCartItems, snapshot = getSessionSnapshot()) {
  const panel = getCheckoutPanel();

  if (!panel) {
    return;
  }

  if (!Array.isArray(cartWithBooks) || cartWithBooks.length === 0) {
    panel.innerHTML = '';
    return;
  }

  if (!isApiProviderMode()) {
    panel.innerHTML = buildCheckoutMessageMarkup(
      'Checkout COD hiện chỉ hỗ trợ khi trang đang kết nối với backend/API mode.',
      '<a href="./contact.html" class="btn btn-secondary btn-block">Để lại thông tin liên hệ</a>'
    );
    return;
  }

  if (snapshot?.authStatus === 'loading' || snapshot?.authStatus === 'idle') {
    panel.innerHTML = buildCheckoutMessageMarkup('Đang đồng bộ phiên đăng nhập để sẵn sàng đặt hàng.');
    return;
  }

  const currentUser = snapshot?.currentUser || null;

  if (!currentUser) {
    panel.innerHTML = buildCheckoutMessageMarkup(
      'Đăng nhập để đặt hàng COD và lưu đơn hàng vào tài khoản của bạn.',
      '<a href="./login.html" class="btn btn-primary btn-block">Đăng nhập để đặt hàng</a>'
    );
    return;
  }

  panel.innerHTML = buildCheckoutFormMarkup(currentUser);
  bindCheckoutForm(qs('[data-checkout-form]', panel));
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
            Xóa
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
          </div>

          <div class="cart-item__unit-price">
            <span>Đơn giá</span>
            <strong>${formatPrice(book.price)}</strong>
          </div>
        </div>

        <a href="${escapeHTML(detailUrl)}" class="cart-item__detail-link text-link">Xem chi tiết</a>

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
            Xóa
          </button>
        </div>
      </div>
    </article>
  `;
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

    clearCheckoutPanel();
    setCartItemCount(0);
    console.error(error);
    return;
  }

  if (renderId !== renderSequence) {
    return;
  }

  if (!cartWithBooks.length) {
    latestCartItems = [];
    renderEmptyCart(container, totalElement);
    clearCheckoutPanel();
    return;
  }

  let grandTotal = 0;

  const cartMarkup = cartWithBooks.map((item) => {
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
};

export const initCartPage = async function (categories) {
  const container = qs('[data-cart-items]');

  if (!container) {
    return;
  }

  categoriesCache = categories;

  if (typeof unsubscribeCartSession === 'function') {
    unsubscribeCartSession();
  }

  unsubscribeCartSession = subscribeSessionStore(function (snapshot) {
    renderCheckoutPanel(latestCartItems, snapshot);
  });

  await renderCartPage();
};
