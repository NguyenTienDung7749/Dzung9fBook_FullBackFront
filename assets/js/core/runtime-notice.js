import { qs } from './dom.js';
import { escapeHTML } from './utils.js';

export const showSiteNotice = function (type, message) {
  const notice = qs('[data-site-notice]');

  if (!notice) {
    return;
  }

  notice.hidden = false;
  notice.className = `site-notice is-${type}`;
  notice.innerHTML = `
    <div class="container site-notice__inner">
      <p class="site-notice__text">${escapeHTML(message)}</p>
    </div>
  `;
};

export const reportRuntimeError = function (message, error) {
  showSiteNotice('error', message);
  console.error(error);
};
