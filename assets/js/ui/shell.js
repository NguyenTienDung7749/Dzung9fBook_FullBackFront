import { qs, qsa } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { buildBooksUrl, getBooksStateFromUrl } from '../data/catalog.js';

export const renderAuthShell = function (snapshot = {}) {
  const isAuthenticated = Boolean(snapshot?.authStatus === 'authenticated' && snapshot?.currentUser);

  qsa('[data-auth-guest]').forEach((element) => {
    element.hidden = isAuthenticated;
  });

  qsa('[data-auth-user]').forEach((element) => {
    element.hidden = !isAuthenticated;
  });
};

export const syncSearchInputs = function (search = window.location.search) {
  const params = new URLSearchParams(search);
  const query = params.get('q') || '';

  qsa('[data-search-input]').forEach((input) => {
    if (document.activeElement !== input) {
      input.value = query;
    }
  });
};

export const setActiveNav = function () {
  const currentPage = document.body.dataset.page;

  qsa('[data-nav-link], [data-auth-link]').forEach((link) => {
    if (link.dataset.pageTarget === currentPage) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });
};

export const buildMobileAccordionMarkup = function (categories, options = {}) {
  const currentState = options.state || { category: 'all', subcategory: '', query: '' };
  const includeAll = options.includeAll !== false;
  const title = options.title || 'Danh mục';
  const intro = options.intro || '';
  const accordionId = options.id || 'category-accordion';
  const linksShouldCloseNav = Boolean(options.closeNavOnLink);
  const preserveQuery = Boolean(options.preserveQuery);

  const parentItems = categories.map((parent) => {
    const isActiveParent = currentState.category === parent.slug;
    const currentChild = isActiveParent ? parent.children.find((child) => child.slug === currentState.subcategory) : null;
    const allLink = buildBooksUrl(categories, {
      category: parent.slug,
      q: preserveQuery ? currentState.query : ''
    });

    const childrenMarkup = parent.children.map((child) => {
      const isActiveChild = isActiveParent && currentState.subcategory === child.slug;

      return `
        <li>
          <a href="${buildBooksUrl(categories, {
            category: parent.slug,
            subcategory: child.slug,
            q: preserveQuery ? currentState.query : ''
          })}" class="category-accordion__link ${isActiveChild ? 'is-active' : ''}" ${linksShouldCloseNav ? 'data-close-nav' : ''}>
            <span>${escapeHTML(child.label)}</span>
            ${child.bookCount ? `<span class="category-accordion__count">${child.bookCount}</span>` : ''}
          </a>
        </li>
      `;
    }).join('');

    return `
      <div class="category-accordion__item ${isActiveParent ? 'is-open' : ''}" data-accordion-item>
        <button class="category-accordion__toggle ${isActiveParent ? 'is-active' : ''}" type="button" data-accordion-toggle aria-expanded="${isActiveParent ? 'true' : 'false'}" aria-controls="${accordionId}-${parent.slug}">
          <span>${escapeHTML(parent.label)}</span>
          <ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>
        </button>

        <div class="category-accordion__panel" id="${accordionId}-${parent.slug}" ${isActiveParent ? '' : 'hidden'}>
          <a href="${allLink}" class="category-accordion__all-link" ${linksShouldCloseNav ? 'data-close-nav' : ''}>
            Xem tất cả ${escapeHTML(parent.label)}
          </a>
          <ul class="category-accordion__children">
            ${childrenMarkup}
          </ul>
          ${currentChild ? `<p class="category-accordion__hint">Đang xem: ${escapeHTML(currentChild.label)}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="category-accordion" data-category-accordion>
      <div class="category-accordion__header">
        <p class="section-label">${escapeHTML(title)}</p>
        ${intro ? `<p class="section-text">${escapeHTML(intro)}</p>` : ''}
      </div>
      ${includeAll ? `<a href="${buildBooksUrl(categories, { q: preserveQuery ? currentState.query : '' })}" class="category-accordion__all-link category-accordion__all-link--standalone" ${linksShouldCloseNav ? 'data-close-nav' : ''}>Tất cả sách</a>` : ''}
      <div class="category-accordion__list">
        ${parentItems}
      </div>
    </div>
  `;
};

export const renderFooterCategories = function (categories) {
  qsa('[data-footer-categories]').forEach((list) => {
    list.innerHTML = categories.slice(0, 6).map((parent) => {
      return `<li><a href="${buildBooksUrl(categories, { category: parent.slug })}" class="footer-link">${escapeHTML(parent.label)}</a></li>`;
    }).join('');
  });
};

export const renderMobileCategoryNavs = function (categories, options = {}) {
  const currentState = options.state || getBooksStateFromUrl(categories);
  const preserveQuery = Boolean(options.preserveQuery);

  qsa('[data-mobile-category-nav]').forEach((container, index) => {
    container.innerHTML = buildMobileAccordionMarkup(categories, {
      id: `drawer-categories-${index}`,
      title: 'Danh mục',
      intro: 'Mở từng nhóm sách để đi nhanh đến danh mục bạn muốn xem.',
      state: currentState,
      preserveQuery,
      closeNavOnLink: true
    });
  });
};

export const initNavbar = function () {
  const navbar = qs('[data-navbar]');
  const overlay = qs('[data-overlay]');
  const toggles = qsa('[data-nav-toggler]');

  if (!navbar || !overlay || !toggles.length) {
    return;
  }

  const openNavbar = function () {
    navbar.classList.add('is-open');
    overlay.classList.add('is-active');
    document.body.classList.add('nav-open');
  };

  const closeNavbar = function () {
    navbar.classList.remove('is-open');
    overlay.classList.remove('is-active');
    document.body.classList.remove('nav-open');
  };

  toggles.forEach((toggleButton) => {
    toggleButton.addEventListener('click', function () {
      if (navbar.classList.contains('is-open')) {
        closeNavbar();
      } else {
        openNavbar();
      }
    });
  });

  navbar.addEventListener('click', function (event) {
    if (event.target.closest('[data-close-nav], [data-nav-link]')) {
      closeNavbar();
    }
  });
};

export const initStickyHeader = function () {
  const header = qs('[data-header]');
  const backTopButton = qs('[data-back-top-btn]');

  if (!header || !backTopButton) {
    return;
  }

  const handleScroll = function () {
    const isScrolled = window.scrollY > 80;
    header.classList.toggle('is-sticky', isScrolled);
    backTopButton.classList.toggle('is-visible', isScrolled);
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll();
};
