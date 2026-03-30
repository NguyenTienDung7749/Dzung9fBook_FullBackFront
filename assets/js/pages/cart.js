import { qs } from '../core/dom.js';
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

const clearCheckoutPanel = function () {
  const panel = getCheckoutPanel();

  if (panel) {
    panel.innerHTML = '';
  }
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
};

const buildCheckoutMessageMarkup = function (message, actionMarkup = '') {
  return `
    <p class="summary-note">${message}</p>
    ${actionMarkup}
  `;
};

const buildCheckoutFormMarkup = function (currentUser) {
  return `
    <p class="summary-note">Đơn hàng sẽ được xác nhận thủ công sau khi bạn gửi thông tin giao nhận.</p>
    <form data-checkout-form novalidate>
      <label class="form-field">
        <span class="label-text">Người nhận</span>
        <input type="text" name="customerName" value="${escapeHTML(String(currentUser?.name || ''))}" readonly>
      </label>

      <label class="form-field">
        <span class="label-text">Email</span>
        <input type="email" name="customerEmail" value="${escapeHTML(String(currentUser?.email || ''))}" readonly>
      </label>

      <label class="form-field">
        <span class="label-text">Số điện thoại</span>
        <input
          type="tel"
          name="customerPhone"
          placeholder="0983 376 932"
          value="${escapeHTML(String(currentUser?.phone || ''))}"
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

      <div class="form-message" data-form-message aria-live="polite"></div>
      <button class="btn btn-primary btn-block" type="submit" data-checkout-submit>Đặt hàng COD</button>
    </form>
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
      await checkout({
        customerPhone,
        shippingAddress,
        ...(note ? { note } : {})
      });
      await syncCartSummary();
      window.location.href = './profile.html';
    } catch (error) {
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
  return `
    <article class="cart-item cart-item--missing">
      <div class="cart-item__details">
        <h2 class="cart-item__title">Tựa sách không còn trong danh mục</h2>
        <p class="cart-item__meta">Mã sách #${escapeHTML(String(item.bookId))}</p>
        <p class="cart-item__meta">Sản phẩm này có thể đã được cập nhật hoặc gỡ khỏi catalog hiện tại.</p>
      </div>

      <div class="cart-item__footer">
        <div class="quantity-control">
          <span>${item.quantity}</span>
        </div>

        <p class="cart-item__total">${formatPrice(0)}</p>

        <button type="button" class="cart-item__remove" data-cart-action="remove" data-book-id="${item.bookId}">
          Xóa
        </button>
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

    const lineTotal = Number(book.price) * item.quantity;
    grandTotal += lineTotal;

    return `
      <article class="cart-item">
        <div class="cart-item__media">
          <img src="${escapeHTML(getBookPrimaryImage(book))}" alt="${escapeHTML(book.title)}" class="cart-item__image" loading="lazy" decoding="async">
        </div>

        <div class="cart-item__details">
          <h2 class="cart-item__title">${escapeHTML(book.title)}</h2>
          <p class="cart-item__meta">${escapeHTML(getBookDisplayAuthor(book) || book.categoryLabel)}${getBookDisplayAuthor(book) ? ` - ${escapeHTML(book.categoryLabel)}` : ''}</p>
          <p class="cart-item__meta">Đơn giá: ${formatPrice(book.price)}</p>
          <a href="${buildDetailUrl(categoriesCache, book, { category: getBookParentSlug(categoriesCache, book), subcategory: getBookSubcategorySlug(book) })}" class="text-link">Xem chi tiết</a>
        </div>

        <div class="cart-item__footer">
          <div class="quantity-control">
            <button type="button" class="quantity-btn" data-cart-action="decrease" data-book-id="${book.id}" aria-label="Giảm số lượng">-</button>
            <span>${item.quantity}</span>
            <button type="button" class="quantity-btn" data-cart-action="increase" data-book-id="${book.id}" aria-label="Tăng số lượng">+</button>
          </div>

          <p class="cart-item__total">${formatPrice(lineTotal)}</p>

          <button type="button" class="cart-item__remove" data-cart-action="remove" data-book-id="${book.id}">
            Xóa
          </button>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = `<div class="cart-list">${cartMarkup}</div>`;
  latestCartItems = cartWithBooks;

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
