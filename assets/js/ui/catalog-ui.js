import { qs, qsa } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import {
  buildBooksUrl,
  buildDetailUrl,
  findParentCategory,
  findSubcategory,
  getBookDisplayAuthor,
  getBookDisplayDescription,
  getBookParentSlug,
  getBookPrimaryImage,
  getBookSubcategorySlug,
  getCategoriesTotalCount,
  getCategorySummaryLabel
} from '../data/catalog.js';
import { buildMobileAccordionMarkup } from './shell.js';

const categoryBrowserExpandedState = new Map();
const categoryBrowserCloseTimers = new Map();
let categoryBrowserDocumentEventsBound = false;

const countBooksInCategory = function (categories, parentSlug) {
  return findParentCategory(categories, parentSlug)?.bookCount || 0;
};

const countBooksInSubcategory = function (categories, parentSlug, subcategorySlug) {
  return findSubcategory(categories, parentSlug, subcategorySlug)?.bookCount || 0;
};

const getCategoryBrowserExpandedParents = function (browserId, fallback = []) {
  const normalizedFallback = [...new Set(fallback.filter(Boolean))];

  if (!browserId) {
    return normalizedFallback;
  }

  if (!categoryBrowserExpandedState.has(browserId)) {
    categoryBrowserExpandedState.set(browserId, normalizedFallback);
  }

  return [...categoryBrowserExpandedState.get(browserId)];
};

const setCategoryBrowserExpandedParents = function (browserId, slugs) {
  if (!browserId) {
    return;
  }

  categoryBrowserExpandedState.set(browserId, [...new Set(slugs.filter(Boolean))]);
};

export const buildCategoryChildLinks = function (categories, parent, options = {}) {
  const query = options.query || '';
  const activeChildSlug = options.activeChildSlug || '';
  const linkClass = options.linkClass || 'category-sidebar__flyout-link';
  const countClass = options.countClass || 'category-sidebar__flyout-count';
  const wrapWithListItem = Boolean(options.wrapWithListItem);
  const extraAttributes = options.extraAttributes || '';
  const preserveQuery = options.preserveQuery !== false;

  return parent.children.map((child) => {
    const childCount = countBooksInSubcategory(categories, parent.slug, child.slug);
    const classes = [linkClass];

    if (activeChildSlug === child.slug) {
      classes.push('is-active');
    }

    const linkMarkup = `
      <a href="${buildBooksUrl(categories, {
        category: parent.slug,
        subcategory: child.slug,
        q: preserveQuery ? query : ''
      })}" class="${classes.join(' ')}" ${extraAttributes}>
        <span>${escapeHTML(child.label)}</span>
        ${childCount > 0 && countClass ? `<span class="${countClass}">${childCount}</span>` : ''}
      </a>
    `;

    return wrapWithListItem ? `<li>${linkMarkup}</li>` : linkMarkup;
  }).join('');
};

export const buildBookCard = function (categories, book, context = {}) {
  const detailUrl = buildDetailUrl(categories, book, context);
  const subcategory = getBookSubcategorySlug(book);
  const subcategoryNode = subcategory ? findSubcategory(categories, getBookParentSlug(categories, book), subcategory) : null;
  const isSoldOut = Boolean(book.isSoldOut);
  const interactiveClass = isSoldOut ? '' : ' product-card--interactive';
  const soldOutClass = isSoldOut ? ' product-card--soldout' : '';
  const hasDiscount = Number(book.compareAtPrice) > Number(book.price);
  const cartButtonLabel = isSoldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ';
  const cartButtonAttributes = `data-add-to-cart data-book-id="${book.id}" data-book-handle="${escapeHTML(book.handle)}" ${isSoldOut ? 'disabled aria-disabled="true"' : ''}`;

  if (book.listingStyle === 'collection') {
    return `
      <article class="product-card product-card--collection${interactiveClass}${soldOutClass}" ${isSoldOut ? 'aria-disabled="true"' : ''}>
        <a class="card-stretched-link" href="${detailUrl}" aria-label="Xem chi tiết ${escapeHTML(book.title)}"></a>

        <div class="card-banner">
          ${hasDiscount ? `<span class="card-discount-badge">${escapeHTML(book.discountLabel || 'Giảm giá')}</span>` : ''}
          ${isSoldOut ? '<span class="card-stock-badge">Hết hàng</span>' : ''}
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
            <a class="btn btn-secondary btn-small detail-link" href="${detailUrl}">Xem chi tiết</a>
            <button class="btn btn-primary btn-small card-button" type="button" ${cartButtonAttributes}>
              ${cartButtonLabel}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="product-card${interactiveClass}${soldOutClass}" ${isSoldOut ? 'aria-disabled="true"' : ''}>
      <a class="card-stretched-link" href="${detailUrl}" aria-label="Xem chi tiết ${escapeHTML(book.title)}"></a>

      <div class="card-banner">
        ${isSoldOut ? '<span class="card-stock-badge">Hết hàng</span>' : ''}
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
            <a class="btn btn-secondary btn-small detail-link" href="${detailUrl}">Xem chi tiết</a>
            <button class="btn btn-primary btn-small card-button" type="button" ${cartButtonAttributes}>
              ${cartButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
};

export const renderBooksCategoryNav = function (categories, state) {
  const container = qs('[data-books-category-nav]');

  if (!container) {
    return;
  }

  const browserId = 'books-category-sidebar';
  const totalBooks = getCategoriesTotalCount(categories);

  const desktopItems = categories.map((parent) => {
    const isActiveParent = state.category === parent.slug;
    const parentCount = countBooksInCategory(categories, parent.slug);

    return `
      <li class="category-sidebar__item ${isActiveParent ? 'is-current' : ''}" data-parent-item data-parent-slug="${parent.slug}">
        <a
          href="${buildBooksUrl(categories, { category: parent.slug, q: state.query })}"
          class="category-sidebar__parent ${isActiveParent ? 'is-active' : ''}"
          data-parent-trigger
          data-parent-slug="${parent.slug}"
          data-inline-toggle="false"
          ${isActiveParent && !state.subcategory ? 'aria-current="page"' : ''}
        >
          <span class="category-sidebar__parent-info">
            <span class="category-sidebar__parent-label">${escapeHTML(parent.label)}</span>
            <span class="category-sidebar__parent-count-label">${parent.children.length} nhánh</span>
          </span>
          <span class="category-sidebar__parent-meta">
            <span class="category-sidebar__count">${parentCount}</span>
            <ion-icon class="category-sidebar__chevron" name="chevron-forward-outline" aria-hidden="true"></ion-icon>
          </span>
        </a>
      </li>
    `;
  }).join('');

  const flyoutPanels = categories.map((parent) => {
    const isActiveParent = state.category === parent.slug;

    return `
      <section class="category-sidebar__flyout-panel" data-parent-panel="${parent.slug}" hidden>
        <div class="category-sidebar__flyout-links">
          ${buildCategoryChildLinks(categories, parent, {
            query: state.query,
            activeChildSlug: isActiveParent ? state.subcategory : '',
            linkClass: 'category-sidebar__flyout-link',
            countClass: 'category-sidebar__flyout-count'
          })}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = `
    <div class="category-sidebar">
      <div class="category-sidebar__header">
        <p class="section-label">Danh mục sách</p>
        <h2 class="category-sidebar__title">Duyệt sách theo chủ đề</h2>
        <p class="category-sidebar__subtitle">${categories.length} nhóm · ${totalBooks} đầu sách</p>
      </div>

      <div class="category-sidebar__nav" data-category-browser data-browser-id="${browserId}" data-inline-toggle="false">
        <a href="${buildBooksUrl(categories, { q: state.query })}" class="category-sidebar__all-link ${state.category === 'all' ? 'is-active' : ''}">
          <span>Tất cả sách</span>
          <span class="category-sidebar__count">${totalBooks}</span>
        </a>

        <ul class="category-sidebar__list">
          ${desktopItems}
        </ul>

        <div class="category-sidebar__flyout" aria-hidden="true">
          ${flyoutPanels}
        </div>
      </div>
    </div>

    <div class="books-catalog__mobile-nav">
      ${buildMobileAccordionMarkup(categories, {
        id: 'books-categories',
        title: 'Danh mục sách',
        intro: 'Chọn nhóm sách hoặc nhánh nhỏ để lọc nhanh.',
        state,
        preserveQuery: true
      })}
    </div>
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
      ? `Cùng nhánh ${subcategory.label}`
      : `Thêm sách trong mục ${parent ? parent.label : 'đang xem'}`;
  }

  if (description) {
    description.textContent = subcategory
      ? 'Những cuốn sách có cùng nhịp đọc để bạn tiếp tục đào sâu hơn vào chủ đề mình đang quan tâm.'
      : 'Một vài gợi ý gần với cuốn sách bạn đang xem để việc chọn thêm đầu sách mới trở nên tự nhiên hơn.';
  }

  container.innerHTML = relatedBooks.map((book) => buildBookCard(categories, book, context)).join('');
  section.hidden = false;
};

export const buildBooksSummary = function (categories, books, state, visibleCount) {
  const displayQuery = state.query.trim();
  const hasQuery = Boolean(displayQuery);

  if (state.category === 'all' && !hasQuery) {
    return `${books.length} tựa sách đang có mặt tại Dzung9fBook.`;
  }

  return `Hiển thị ${visibleCount} cuốn trong mục ${getCategorySummaryLabel(categories, state)}${hasQuery ? ` cho từ khóa “${displayQuery}”` : ''}.`;
};

const closeAllCategoryBrowsers = function () {
  qsa('[data-category-browser]').forEach((browser) => {
    const browserId = browser.dataset.browserId || '';

    if (browserId && categoryBrowserCloseTimers.has(browserId)) {
      window.clearTimeout(categoryBrowserCloseTimers.get(browserId));
      categoryBrowserCloseTimers.delete(browserId);
    }

    browser.classList.remove('has-preview');
    browser.dataset.previewParent = '';
    browser.style.removeProperty('--flyout-offset');
    qsa('[data-parent-item]', browser).forEach((item) => {
      item.classList.remove('is-preview');
    });
    qsa('[data-parent-panel]', browser).forEach((panel) => {
      panel.classList.remove('is-active');
      panel.hidden = true;
    });
  });
};

const cancelCategoryBrowserClose = function (browser) {
  if (!browser) {
    return;
  }

  const browserId = browser.dataset.browserId || '';

  if (!browserId || !categoryBrowserCloseTimers.has(browserId)) {
    return;
  }

  window.clearTimeout(categoryBrowserCloseTimers.get(browserId));
  categoryBrowserCloseTimers.delete(browserId);
};

const clearCategoryBrowserPreview = function (browser) {
  if (!browser) {
    return;
  }

  cancelCategoryBrowserClose(browser);
  browser.classList.remove('has-preview');
  browser.dataset.previewParent = '';
  browser.style.removeProperty('--flyout-offset');

  qsa('[data-parent-item]', browser).forEach((item) => {
    item.classList.remove('is-preview');
  });

  qsa('[data-parent-panel]', browser).forEach((panel) => {
    panel.classList.remove('is-active');
    panel.hidden = true;
  });
};

const scheduleCategoryBrowserClose = function (browser, delay = 180) {
  if (!browser) {
    return;
  }

  const browserId = browser.dataset.browserId || '';

  if (!browserId) {
    clearCategoryBrowserPreview(browser);
    return;
  }

  cancelCategoryBrowserClose(browser);

  const timeoutId = window.setTimeout(function () {
    categoryBrowserCloseTimers.delete(browserId);
    clearCategoryBrowserPreview(browser);
  }, delay);

  categoryBrowserCloseTimers.set(browserId, timeoutId);
};

const isCategoryBrowserInlineToggleEnabled = function (browser) {
  return browser?.dataset.inlineToggle !== 'false';
};

const hasExpandedCategoryBrowserParent = function (browser) {
  if (!isCategoryBrowserInlineToggleEnabled(browser)) {
    return false;
  }

  const browserId = browser ? browser.dataset.browserId || '' : '';

  return getCategoryBrowserExpandedParents(browserId).length > 0;
};

const syncCategoryBrowserInlineState = function (browser) {
  const browserId = browser.dataset.browserId || '';
  const expandedParents = new Set(getCategoryBrowserExpandedParents(browserId));
  const inlineToggleEnabled = isCategoryBrowserInlineToggleEnabled(browser);

  qsa('[data-parent-item]', browser).forEach((item) => {
    const slug = item.dataset.parentSlug;
    const trigger = qs('[data-parent-trigger]', item);
    const inlinePanel = qs('[data-inline-panel]', item);
    const isExpanded = inlineToggleEnabled && expandedParents.has(slug);

    item.classList.toggle('is-expanded', isExpanded);

    if (trigger) {
      trigger.classList.toggle('is-expanded', isExpanded);
      if (inlinePanel) {
        trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      } else {
        trigger.removeAttribute('aria-expanded');
      }
    }

    if (inlinePanel) {
      inlinePanel.hidden = !isExpanded;
    }
  });
};

const activateBrowserPreview = function (browser, slug) {
  if (!window.matchMedia('(min-width: 992px)').matches || !slug) {
    clearCategoryBrowserPreview(browser);
    return;
  }

  cancelCategoryBrowserClose(browser);

  if (hasExpandedCategoryBrowserParent(browser)) {
    clearCategoryBrowserPreview(browser);
    return;
  }

  const activeItem = qs(`[data-parent-item][data-parent-slug="${slug}"]`, browser);

  browser.classList.add('has-preview');
  browser.dataset.previewParent = slug;
  browser.style.setProperty('--flyout-offset', `${activeItem ? activeItem.offsetTop : 0}px`);

  qsa('[data-parent-item]', browser).forEach((item) => {
    item.classList.toggle('is-preview', item.dataset.parentSlug === slug);
  });

  qsa('[data-parent-panel]', browser).forEach((panel) => {
    const isActive = panel.dataset.parentPanel === slug;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
};

const toggleCategoryBrowserParent = function (browser, slug) {
  if (!isCategoryBrowserInlineToggleEnabled(browser)) {
    return;
  }

  const browserId = browser.dataset.browserId || '';
  const expandedParents = new Set(getCategoryBrowserExpandedParents(browserId));

  if (expandedParents.has(slug)) {
    expandedParents.clear();
  } else {
    expandedParents.clear();
    expandedParents.add(slug);
  }

  setCategoryBrowserExpandedParents(browserId, [...expandedParents]);
  syncCategoryBrowserInlineState(browser);
  clearCategoryBrowserPreview(browser);
};

export const initCategoryBrowsers = function () {
  const browsers = qsa('[data-category-browser]');

  if (!browsers.length) {
    return;
  }

  browsers.forEach((browser) => {
    syncCategoryBrowserInlineState(browser);

    if (browser.dataset.bound === 'true') {
      return;
    }

    browser.dataset.bound = 'true';

    browser.addEventListener('mouseenter', function () {
      cancelCategoryBrowserClose(browser);
    });

    qsa('[data-parent-trigger]', browser).forEach((button) => {
      button.addEventListener('mouseenter', function () {
        if (!window.matchMedia('(min-width: 992px)').matches) {
          return;
        }

        activateBrowserPreview(browser, button.dataset.parentSlug);
      });

      button.addEventListener('focus', function () {
        activateBrowserPreview(browser, button.dataset.parentSlug);
      });

      button.addEventListener('click', function () {
        if (!isCategoryBrowserInlineToggleEnabled(browser) || button.dataset.inlineToggle === 'false') {
          return;
        }

        toggleCategoryBrowserParent(browser, button.dataset.parentSlug);
      });
    });

    browser.addEventListener('mouseleave', function () {
      if (!window.matchMedia('(min-width: 992px)').matches) {
        return;
      }

      scheduleCategoryBrowserClose(browser);
    });

    browser.addEventListener('focusout', function (event) {
      if (event.relatedTarget && browser.contains(event.relatedTarget)) {
        return;
      }

      closeAllCategoryBrowsers();
    });
  });

  if (!categoryBrowserDocumentEventsBound) {
    categoryBrowserDocumentEventsBound = true;

    document.addEventListener('click', function (event) {
      if (!event.target.closest('[data-category-browser]')) {
        closeAllCategoryBrowsers();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAllCategoryBrowsers();
      }
    });
  }
};

export const initCategoryAccordions = function () {
  qsa('[data-category-accordion]').forEach((accordion) => {
    qsa('[data-accordion-toggle]', accordion).forEach((toggle) => {
      if (toggle.dataset.bound === 'true') {
        return;
      }

      toggle.dataset.bound = 'true';

      toggle.addEventListener('click', function () {
        const item = toggle.closest('[data-accordion-item]');
        const panel = qs('.category-accordion__panel', item);
        const willOpen = !item.classList.contains('is-open');

        qsa('[data-accordion-item]', accordion).forEach((otherItem) => {
          const otherToggle = qs('[data-accordion-toggle]', otherItem);
          const otherPanel = qs('.category-accordion__panel', otherItem);

          otherItem.classList.remove('is-open');

          if (otherToggle) {
            otherToggle.classList.remove('is-active');
            otherToggle.setAttribute('aria-expanded', 'false');
          }

          if (otherPanel) {
            otherPanel.hidden = true;
          }
        });

        item.classList.toggle('is-open', willOpen);
        toggle.classList.toggle('is-active', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

        if (panel) {
          panel.hidden = !willOpen;
        }
      });
    });
  });
};
