import { qs, qsa } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import {
  buildBooksUrl,
  findParentCategory,
  findSubcategory,
  getBackContextForBook,
  getBookDescriptionMarkup,
  getBookDetailProfile,
  getBookDisplayAuthor,
  getBookDisplayDescription,
  getBookGalleryCaption,
  getBookGalleryImages,
  getBookInternalCode,
  getBookParentSlug,
  getBookSpecs,
  getBookSubcategorySlug,
  getRelatedBooks
} from '../data/catalog.js';
import { getCatalogIndex, resolveBookFromSearch } from '../services/catalog.js';
import { renderRelatedBooksSection } from '../ui/book-cards.js';

let activeBookGallery = null;
let bookGalleryDocumentEventsBound = false;

const renderDetailState = function (container, title, description, actionsMarkup = '') {
  container.innerHTML = `
    <div class="empty-state empty-state--detail">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionsMarkup}
    </div>
  `;
};

const setBookGalleryImage = function (nextIndex) {
  if (!activeBookGallery || !activeBookGallery.images.length) {
    return;
  }

  const totalImages = activeBookGallery.images.length;
  const normalizedIndex = ((Number(nextIndex) % totalImages) + totalImages) % totalImages;
  const nextImage = activeBookGallery.images[normalizedIndex];

  activeBookGallery.currentIndex = normalizedIndex;

  if (activeBookGallery.inlineImage) {
    activeBookGallery.inlineImage.src = nextImage;
    activeBookGallery.inlineImage.alt = getBookGalleryCaption(activeBookGallery.book, normalizedIndex, totalImages);
  }

  if (activeBookGallery.inlineCounter) {
    activeBookGallery.inlineCounter.textContent = `${normalizedIndex + 1} / ${totalImages}`;
  }

  activeBookGallery.inlineThumbs.forEach((thumb, index) => {
    const isActive = index === normalizedIndex;
    thumb.classList.toggle('is-active', isActive);
    thumb.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (activeBookGallery.viewerImage) {
    activeBookGallery.viewerImage.src = nextImage;
    activeBookGallery.viewerImage.alt = getBookGalleryCaption(activeBookGallery.book, normalizedIndex, totalImages);
  }

  if (activeBookGallery.viewerCounter) {
    activeBookGallery.viewerCounter.textContent = `${normalizedIndex + 1} / ${totalImages}`;
  }

  if (activeBookGallery.viewerCaption) {
    activeBookGallery.viewerCaption.textContent = getBookGalleryCaption(activeBookGallery.book, normalizedIndex, totalImages);
  }

  activeBookGallery.viewerThumbs.forEach((thumb, index) => {
    const isActive = index === normalizedIndex;
    thumb.classList.toggle('is-active', isActive);
    thumb.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
};

const closeBookGalleryViewer = function () {
  if (!activeBookGallery || !activeBookGallery.viewer) {
    return;
  }

  activeBookGallery.viewer.hidden = true;
  activeBookGallery.viewer.classList.remove('is-open');
  document.body.classList.remove('gallery-open');
};

const openBookGalleryViewer = function (nextIndex = 0) {
  if (!activeBookGallery || !activeBookGallery.viewer || !activeBookGallery.images.length) {
    return;
  }

  activeBookGallery.viewer.hidden = false;
  activeBookGallery.viewer.classList.add('is-open');
  document.body.classList.add('gallery-open');
  setBookGalleryImage(nextIndex);

  if (activeBookGallery.viewerCloseButton) {
    activeBookGallery.viewerCloseButton.focus();
  }
};

const bindBookGalleryDocumentEvents = function () {
  if (bookGalleryDocumentEventsBound) {
    return;
  }

  bookGalleryDocumentEventsBound = true;

  document.addEventListener('keydown', function (event) {
    if (!activeBookGallery || !activeBookGallery.viewer || activeBookGallery.viewer.hidden) {
      return;
    }

    if (event.key === 'Escape') {
      closeBookGalleryViewer();
      return;
    }

    if (event.key === 'ArrowLeft') {
      setBookGalleryImage(activeBookGallery.currentIndex - 1);
    }

    if (event.key === 'ArrowRight') {
      setBookGalleryImage(activeBookGallery.currentIndex + 1);
    }
  });
};

const initBookDetailGallery = function (book) {
  const galleryElement = qs('[data-book-gallery]');
  const viewer = qs('[data-book-gallery-viewer]');

  activeBookGallery = null;

  if (!galleryElement || !viewer) {
    return;
  }

  const images = getBookGalleryImages(book);

  if (!images.length) {
    return;
  }

  activeBookGallery = {
    book,
    images,
    currentIndex: 0,
    viewer,
    inlineImage: qs('[data-gallery-main-image]', galleryElement),
    inlineCounter: qs('[data-gallery-inline-counter]', galleryElement),
    inlineThumbs: qsa('[data-gallery-thumb]', galleryElement),
    viewerImage: qs('[data-gallery-viewer-image]', viewer),
    viewerCounter: qs('[data-gallery-viewer-counter]', viewer),
    viewerCaption: qs('[data-gallery-viewer-caption]', viewer),
    viewerThumbs: qsa('[data-gallery-viewer-thumb]', viewer),
    viewerCloseButton: qs('[data-gallery-close-button]', viewer)
  };

  qsa('[data-gallery-open]', galleryElement).forEach((button) => {
    button.addEventListener('click', function () {
      openBookGalleryViewer(activeBookGallery.currentIndex);
    });
  });

  qsa('[data-gallery-thumb]', galleryElement).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(Number(button.dataset.imageIndex));
    });
  });

  qsa('[data-gallery-prev]', galleryElement).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(activeBookGallery.currentIndex - 1);
    });
  });

  qsa('[data-gallery-next]', galleryElement).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(activeBookGallery.currentIndex + 1);
    });
  });

  qsa('[data-gallery-close]', viewer).forEach((button) => {
    button.addEventListener('click', closeBookGalleryViewer);
  });

  qsa('[data-gallery-viewer-thumb]', viewer).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(Number(button.dataset.imageIndex));
    });
  });

  qsa('[data-gallery-viewer-prev]', viewer).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(activeBookGallery.currentIndex - 1);
    });
  });

  qsa('[data-gallery-viewer-next]', viewer).forEach((button) => {
    button.addEventListener('click', function () {
      setBookGalleryImage(activeBookGallery.currentIndex + 1);
    });
  });

  bindBookGalleryDocumentEvents();
  setBookGalleryImage(0);
};

export const initBookDetailPage = async function (categories) {
  const container = qs('[data-book-detail]');

  if (!container) {
    return;
  }

  let book;

  try {
    book = await resolveBookFromSearch();
  } catch (error) {
    renderDetailState(
      container,
      'Không thể tải chi tiết sách',
      'Dữ liệu của cuốn sách này đang tạm thời chưa phản hồi. Vui lòng thử tải lại trang hoặc quay về danh mục sách.',
      `<a href="${buildBooksUrl(categories)}" class="btn btn-primary">Quay lại danh mục sách</a>`
    );
    console.error(error);
    return;
  }

  if (!book) {
    renderDetailState(
      container,
      'Không tìm thấy cuốn sách bạn đang xem',
      'Tựa sách này có thể đã được cập nhật khỏi danh mục. Bạn hãy quay lại trang sách để tiếp tục chọn đầu sách phù hợp.',
      `<a href="${buildBooksUrl(categories)}" class="btn btn-primary">Quay lại danh mục sách</a>`
    );
    return;
  }

  const context = getBackContextForBook(categories, book);
  const parent = findParentCategory(categories, context.category) || findParentCategory(categories, getBookParentSlug(categories, book));
  const subcategory = context.subcategory ? findSubcategory(categories, context.category, context.subcategory) : null;
  const backUrl = buildBooksUrl(categories, context);
  const categoryUrl = buildBooksUrl(categories, { category: parent ? parent.slug : 'all' });
  const subcategoryUrl = parent && subcategory
    ? buildBooksUrl(categories, { category: parent.slug, subcategory: subcategory.slug })
    : '';
  const detailProfile = getBookDetailProfile(categories, book);
  const internalCode = getBookInternalCode(book);
  const galleryImages = getBookGalleryImages(book);
  const hasDiscount = Number(book.compareAtPrice) > Number(book.price);
  const quickFacts = getBookSpecs(book);
  const descriptionMarkup = getBookDescriptionMarkup(book);
  const purchaseDescription = getBookDisplayDescription(book) || detailProfile.lead;
  const metaChips = [
    parent ? parent.label : book.categoryLabel || book.category,
    subcategory ? subcategory.label : '',
    book.bookType || '',
    book.year || ''
  ].filter(Boolean);
  const actionDisabledAttributes = book.isSoldOut ? 'disabled aria-disabled="true"' : '';
  const soldOutNoticeMarkup = book.isSoldOut
    ? `
      <div class="book-detail-card__stock-notice" role="status" aria-live="polite">
        <strong>Het hang</strong>
        <span>Tua sach nay dang o trang thai het hang. Ban van co the xem thong tin, nhung moi hanh dong mua se bi khoa va backend checkout van chan nhu binh thuong.</span>
      </div>
    `
    : '';
  const authorName = getBookDisplayAuthor(book);
  const authorMarkup = authorName ? `<p class="book-detail-card__author">Tác giả: ${escapeHTML(authorName)}</p>` : '';

  container.innerHTML = `
    <article class="book-detail-card">
      <nav class="book-detail-card__breadcrumb" aria-label="Điều hướng sản phẩm">
        <a href="./index.html">Trang chủ</a>
        <span>/</span>
        <a href="${categoryUrl}">${escapeHTML(parent ? parent.label : 'Sách')}</a>
        ${subcategory ? `<span>/</span><a href="${subcategoryUrl}">${escapeHTML(subcategory.label)}</a>` : ''}
        <span>/</span>
        <span aria-current="page">${escapeHTML(book.title)}</span>
      </nav>

      <div class="book-detail-card__gallery" data-book-gallery>
        <div class="book-detail-card__media">
          <div class="book-detail-card__stage-frame">
            <button class="book-detail-card__stage-button" type="button" data-gallery-open aria-label="Mở ảnh lớn của ${escapeHTML(book.title)}">
              <div class="book-detail-card__image-shell">
                <img src="${escapeHTML(galleryImages[0])}" alt="${escapeHTML(getBookGalleryCaption(book, 0, galleryImages.length))}" class="book-detail-card__image" data-gallery-main-image decoding="async">
              </div>
            </button>

            ${galleryImages.length > 1 ? `
              <button class="book-detail-card__stage-nav book-detail-card__stage-nav--prev" type="button" data-gallery-prev aria-label="Ảnh trước">
                <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
              </button>
              <button class="book-detail-card__stage-nav book-detail-card__stage-nav--next" type="button" data-gallery-next aria-label="Ảnh tiếp theo">
                <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon>
              </button>
            ` : ''}
          </div>

          <div class="book-detail-card__media-caption">
            <span class="book-detail-card__media-counter" data-gallery-inline-counter>1 / ${galleryImages.length}</span>
            <button class="book-detail-card__zoom-link" type="button" data-gallery-open>Xem ảnh lớn</button>
          </div>
        </div>

        <div class="book-detail-card__thumbs" aria-label="Ảnh sản phẩm">
          ${galleryImages.map((image, index) => `
            <button
              class="book-detail-card__thumb ${index === 0 ? 'is-active' : ''}"
              type="button"
              data-gallery-thumb
              data-image-index="${index}"
              aria-label="Xem ảnh ${index + 1} của ${escapeHTML(book.title)}"
              aria-pressed="${index === 0 ? 'true' : 'false'}"
            >
              <img src="${escapeHTML(image)}" alt="" class="book-detail-card__thumb-image" loading="lazy" decoding="async">
            </button>
          `).join('')}
        </div>
      </div>

      <div class="book-detail-card__purchase">
        <div class="book-detail-card__heading">
          <p class="book-detail-card__eyebrow">${escapeHTML(subcategory ? subcategory.label : parent ? parent.label : book.categoryLabel || book.category)}</p>
          <h1 class="book-detail-card__title">${escapeHTML(book.title)}</h1>
          ${authorMarkup}
        </div>

        <div class="book-detail-card__purchase-panel">
          <div class="book-detail-card__purchase-head">
            <p class="book-detail-card__code">Mã sách: ${escapeHTML(internalCode)}</p>
            <p class="book-detail-card__signature">Dzung9fBook tuyển chọn / ${escapeHTML(subcategory ? subcategory.label : parent ? parent.label : book.categoryLabel || book.category)}</p>
          </div>

          <div class="book-detail-card__meta">
            ${metaChips.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}
          </div>

          <div class="book-detail-card__price-group">
            <p class="book-detail-card__price">${formatPrice(book.price)}</p>
            ${hasDiscount ? `<p class="book-detail-card__compare-price">${formatPrice(book.compareAtPrice)}</p>` : ''}
          </div>
          <p class="book-detail-card__price-note">${escapeHTML(purchaseDescription)}</p>
          ${soldOutNoticeMarkup}

          <div class="book-detail-card__actions">
            <button class="btn btn-primary" type="button" data-add-to-cart data-book-id="${book.id}" data-book-handle="${escapeHTML(book.handle)}" ${actionDisabledAttributes}>
              ${book.isSoldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
            </button>
            <button class="btn btn-secondary" type="button" data-buy-now data-book-id="${book.id}" data-book-handle="${escapeHTML(book.handle)}" ${actionDisabledAttributes}>
              ${book.isSoldOut ? 'Chưa thể mua ngay' : 'Mua ngay'}
            </button>
          </div>

          <a class="book-detail-card__back-link" href="${backUrl}">← Quay lại danh mục đang xem</a>
        </div>
      </div>

      <div class="book-detail-card__body">
        <section class="book-detail-story">
          <h2 class="book-detail-story__title">Nội dung sách</h2>
          <div class="book-detail-story__content">
            ${descriptionMarkup}
          </div>
        </section>

        <aside class="book-detail-specs">
          <p class="book-detail-specs__label">Thông tin chi tiết</p>
          <dl class="book-detail-specs__grid">
            ${quickFacts.map((item) => `
              <div class="book-detail-specs__item">
                <dt>${escapeHTML(item.label)}</dt>
                <dd>${escapeHTML(item.value)}</dd>
              </div>
            `).join('')}
          </dl>
        </aside>
      </div>
    </article>

    <div class="book-gallery-viewer" data-book-gallery-viewer hidden>
      <button class="book-gallery-viewer__backdrop" type="button" data-gallery-close aria-label="Đóng trình xem ảnh"></button>

      <div class="book-gallery-viewer__dialog" role="dialog" aria-modal="true" aria-label="Xem ảnh sản phẩm">
        <div class="book-gallery-viewer__topbar">
          <span class="book-gallery-viewer__counter" data-gallery-viewer-counter>1 / ${galleryImages.length}</span>
          <button class="book-gallery-viewer__close" type="button" data-gallery-close data-gallery-close-button aria-label="Đóng trình xem ảnh">
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>

        <div class="book-gallery-viewer__main ${galleryImages.length > 1 ? 'book-gallery-viewer__main--carousel' : ''}">
          ${galleryImages.length > 1 ? `
            <button class="book-gallery-viewer__nav book-gallery-viewer__nav--prev" type="button" data-gallery-viewer-prev aria-label="Ảnh trước">
              <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
            </button>
          ` : ''}

          <figure class="book-gallery-viewer__figure">
            <img src="${escapeHTML(galleryImages[0])}" alt="${escapeHTML(getBookGalleryCaption(book, 0, galleryImages.length))}" class="book-gallery-viewer__image" data-gallery-viewer-image decoding="async">
            <figcaption class="book-gallery-viewer__caption" data-gallery-viewer-caption>${escapeHTML(getBookGalleryCaption(book, 0, galleryImages.length))}</figcaption>
          </figure>

          ${galleryImages.length > 1 ? `
            <button class="book-gallery-viewer__nav book-gallery-viewer__nav--next" type="button" data-gallery-viewer-next aria-label="Ảnh tiếp theo">
              <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon>
            </button>
          ` : ''}
        </div>

        <div class="book-gallery-viewer__thumbs" aria-label="Chọn ảnh trong trình xem">
          ${galleryImages.map((image, index) => `
            <button
              class="book-gallery-viewer__thumb ${index === 0 ? 'is-active' : ''}"
              type="button"
              data-gallery-viewer-thumb
              data-image-index="${index}"
              aria-label="Chọn ảnh ${index + 1}"
              aria-pressed="${index === 0 ? 'true' : 'false'}"
            >
              <img src="${escapeHTML(image)}" alt="" class="book-gallery-viewer__thumb-image" loading="lazy" decoding="async">
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  try {
    const catalogIndex = await getCatalogIndex();
    const relatedBooks = getRelatedBooks(categories, catalogIndex, book);
    renderRelatedBooksSection(categories, relatedBooks, context);
  } catch (error) {
    const relatedSection = qs('[data-related-books-section]');

    if (relatedSection) {
      relatedSection.hidden = true;
    }

    console.error(error);
  }

  initBookDetailGallery(book);
};
