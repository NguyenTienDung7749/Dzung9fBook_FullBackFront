import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import {
  buildDetailUrl,
  findParentCategory,
  findSubcategory,
  getBookDisplayAuthor,
  getBookDisplayDescription,
  getBookParentSlug,
  getBookPrimaryImage,
  getBookSubcategorySlug
} from '../data/catalog.js';

export const buildBookCard = function (categories, book, context = {}) {
  const detailUrl = buildDetailUrl(categories, book, context);
  const subcategory = getBookSubcategorySlug(book);
  const subcategoryNode = subcategory ? findSubcategory(categories, getBookParentSlug(categories, book), subcategory) : null;
  const isSoldOut = Boolean(book.isSoldOut);
  const interactiveClass = isSoldOut ? '' : ' product-card--interactive';
  const soldOutClass = isSoldOut ? ' product-card--soldout' : '';
  const hasDiscount = Number(book.compareAtPrice) > Number(book.price);
  const stretchedLinkMarkup = isSoldOut
    ? ''
    : `<a class="card-stretched-link" href="${detailUrl}" aria-label="Xem chi tiet ${escapeHTML(book.title)}"></a>`;
  const actionMarkup = isSoldOut
    ? ''
    : `
      <a class="btn btn-secondary btn-small detail-link" href="${detailUrl}">Xem chi tiet</a>
      <button class="btn btn-primary btn-small card-button" type="button" data-add-to-cart data-book-id="${book.id}" data-book-handle="${escapeHTML(book.handle)}">
        Them vao gio
      </button>
    `;

  if (book.listingStyle === 'collection') {
    return `
      <article class="product-card product-card--collection${interactiveClass}${soldOutClass}" ${isSoldOut ? 'aria-disabled="true"' : ''}>
        ${stretchedLinkMarkup}

        <div class="card-banner">
          ${hasDiscount ? `<span class="card-discount-badge">${escapeHTML(book.discountLabel || 'Giam gia')}</span>` : ''}
          ${isSoldOut ? '<span class="card-stock-badge">Het hang</span>' : ''}
          <div class="card-image-wrapper">
            <img src="${escapeHTML(getBookPrimaryImage(book))}" alt="${escapeHTML(book.title)}" class="card-image" loading="lazy" decoding="async">
          </div>
        </div>

        <div class="card-content">
          <h3 class="card-title">${escapeHTML(book.title)}</h3>
          <p class="card-price">
            <span class="card-price-current">${formatPrice(book.price)}</span>
            ${hasDiscount ? `<span class="card-price-compare">${formatPrice(book.compareAtPrice)}</span>` : ''}
          </p>

          <div class="card-actions">
            ${actionMarkup}
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="product-card${interactiveClass}${soldOutClass}" ${isSoldOut ? 'aria-disabled="true"' : ''}>
      ${stretchedLinkMarkup}

      <div class="card-banner">
        ${isSoldOut ? '<span class="card-stock-badge">Het hang</span>' : ''}
        <div class="card-image-wrapper">
          <img src="${escapeHTML(getBookPrimaryImage(book))}" alt="${escapeHTML(book.title)}" class="card-image" loading="lazy" decoding="async">
        </div>
      </div>

      <div class="card-content">
        <div class="card-meta">
          <span class="card-category">${escapeHTML(book.categoryLabel || book.category)}</span>
          ${subcategoryNode ? `<span class="card-meta-separator" aria-hidden="true"></span><span class="card-subcategory">${escapeHTML(subcategoryNode.label)}</span>` : ''}
        </div>
        <h3 class="card-title">${escapeHTML(book.title)}</h3>
        <p class="card-author">${escapeHTML(getBookDisplayAuthor(book))}</p>
        <p class="card-description">${escapeHTML(getBookDisplayDescription(book) || '')}</p>

        <div class="card-footer">
          <p class="card-price">${formatPrice(book.price)}</p>

          <div class="card-actions">
            ${actionMarkup}
          </div>
        </div>
      </div>
    </article>
  `;
};

export const renderRelatedBooksSection = function (categories, relatedBooks, context = {}) {
  const section = qs('[data-related-books-section]');
  const container = qs('[data-related-books-list]');

  if (!section || !container) {
    return;
  }

  if (!relatedBooks.length) {
    section.hidden = true;
    return;
  }

  const title = qs('[data-related-books-title]', section);
  const description = qs('[data-related-books-description]', section);
  const subcategory = context.subcategory ? findSubcategory(categories, context.category, context.subcategory) : null;
  const parent = context.category ? findParentCategory(categories, context.category) : null;

  if (title) {
    title.textContent = subcategory
      ? `Cung nhanh ${subcategory.label}`
      : `Them sach trong muc ${parent ? parent.label : 'dang xem'}`;
  }

  if (description) {
    description.textContent = subcategory
      ? 'Nhung cuon sach cung nhanh de ban tiep tuc dao sau hon vao chu de minh dang quan tam.'
      : 'Mot vai goi y gan voi cuon sach ban dang xem de viec chon them dau sach moi tro nen tu nhien hon.';
  }

  container.innerHTML = relatedBooks.map((item) => buildBookCard(categories, item, context)).join('');
  section.hidden = false;
};
