import { qs } from '../core/dom.js';
import { formatPrice, escapeHTML } from '../core/utils.js';
import {
  buildDetailUrl,
  getBookDisplayAuthor,
  getBookParentSlug,
  getBookPrimaryImage,
  getBookSubcategorySlug
} from '../data/catalog.js';
import { getDetailedCart } from '../services/cart.js';

let categoriesCache = [];
let renderSequence = 0;

const renderCartState = function (container, title, description, actionsMarkup = '') {
  container.innerHTML = `
    <div class="empty-state empty-state--catalog">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionsMarkup ? `<div class="empty-state__actions">${actionsMarkup}</div>` : ''}
    </div>
  `;
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

    console.error(error);
    return;
  }

  if (renderId !== renderSequence) {
    return;
  }

  if (!cartWithBooks.length) {
    renderEmptyCart(container, totalElement);
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

  if (totalElement) {
    totalElement.textContent = formatPrice(grandTotal);
  }
};

export const initCartPage = async function (categories) {
  const container = qs('[data-cart-items]');

  if (!container) {
    return;
  }

  categoriesCache = categories;
  await renderCartPage();
};
