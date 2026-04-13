import { qs } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { BLOG_POSTS } from '../data/blog.js';

const buildBlogCard = function (post) {
  return `
    <article class="blog-card">
      <a href="${escapeHTML(post.detailUrl)}" class="blog-card__media-link" aria-label="Đọc review ${escapeHTML(post.title)}">
        <div class="blog-card__media">
          <img src="${escapeHTML(post.image)}" alt="${escapeHTML(post.title)}" class="blog-card__image" loading="lazy" decoding="async">
        </div>
      </a>

      <div class="blog-card__content">
        <div class="blog-card__meta">
          <span class="blog-card__badge">${escapeHTML(post.badgeLabel)}</span>
          <span class="blog-card__meta-item">${escapeHTML(post.dateLabel)}</span>
          <span class="blog-card__meta-separator" aria-hidden="true"></span>
          <span class="blog-card__meta-item">${escapeHTML(post.readTime)}</span>
        </div>

        <h3 class="blog-card__title">
          <a href="${escapeHTML(post.detailUrl)}" class="blog-card__title-link">${escapeHTML(post.title)}</a>
        </h3>
        <p class="blog-card__author">${escapeHTML(post.author)}</p>
        <p class="blog-card__excerpt">${escapeHTML(post.excerpt)}</p>

        <div class="blog-card__footer">
          <a href="${escapeHTML(post.detailUrl)}" class="btn btn-secondary btn-small blog-card__cta">${escapeHTML(post.ctaLabel)}</a>
        </div>
      </div>
    </article>
  `;
};

export const initBlogPage = function () {
  const listContainer = qs('[data-blog-list]');

  if (!listContainer) {
    return;
  }

  listContainer.innerHTML = BLOG_POSTS.map(buildBlogCard).join('');
};
