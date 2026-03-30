export const escapeHTML = function (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

export const slugifyText = function (value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const formatPrice = function (value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
};

export const normalizeText = function (value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
};

export const normalizeSpecKey = function (value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

export const extractPlainTextFromMarkup = function (markup) {
  const rawMarkup = String(markup || '').trim();

  if (!rawMarkup) {
    return '';
  }

  const template = document.createElement('template');
  template.innerHTML = rawMarkup;
  return template.content.textContent.replace(/\s+/g, ' ').trim();
};
