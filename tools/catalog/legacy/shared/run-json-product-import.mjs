import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_DECLARATION_PATTERN = /const books = (\[[\s\S]*\]);\s*(?:\/\*[\s\S]*\*\/\s*)?$/;
const FETCH_RETRY_LIMIT = 6;
const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*'
};

const SPEC_LABEL_PRIORITY = [
  'M\u00e3 h\u00e0ng',
  'Barcode - ISBN',
  'ISBN',
  'D\u1ef1 ki\u1ebfn c\u00f3 h\u00e0ng',
  'Nh\u00e0 cung c\u1ea5p',
  'T\u00e1c gi\u1ea3',
  'Ng\u01b0\u1eddi d\u1ecbch',
  'NXB',
  'N\u0103m XB',
  'Ng\u00e0y xu\u1ea5t b\u1ea3n',
  'Ng\u00f4n ng\u1eef',
  'Tr\u1ecdng l\u01b0\u1ee3ng',
  'K\u00edch th\u01b0\u1edbc',
  'S\u1ed1 trang',
  'H\u00ecnh th\u1ee9c',
  'Gi\u00e1',
  'T\u00ean s\u00e1ch',
  'T\u00e1c gi\u1ea3 / D\u1ecbch gi\u1ea3'
];

const SPEC_LABEL_ALIASES = new Map([
  ['M\u00e3 h\u00e0ng', 'M\u00e3 h\u00e0ng'],
  ['Code', 'M\u00e3 h\u00e0ng'],
  ['Barcode - ISBN', 'Barcode - ISBN'],
  ['ISBN', 'ISBN'],
  ['D\u1ef1 Ki\u1ebfn C\u00f3 H\u00e0ng', 'D\u1ef1 ki\u1ebfn c\u00f3 h\u00e0ng'],
  ['Ng\u00e0y D\u1ef1 Ki\u1ebfn Ph\u00e1t H\u00e0nh', 'D\u1ef1 ki\u1ebfn c\u00f3 h\u00e0ng'],
  ['\u0110\u1ebfm ng\u01b0\u1ee3c th\u1eddi gian', 'D\u1ef1 ki\u1ebfn c\u00f3 h\u00e0ng'],
  ['T\u00ean Nh\u00e0 Cung C\u1ea5p', 'Nh\u00e0 cung c\u1ea5p'],
  ['Nh\u00e0 Cung C\u1ea5p', 'Nh\u00e0 cung c\u1ea5p'],
  ['Nh\u00e0 cung c\u1ea5p', 'Nh\u00e0 cung c\u1ea5p'],
  ['Nh\u00e0 ph\u00e1t h\u00e0nh', 'Nh\u00e0 cung c\u1ea5p'],
  ['Nh\u00e0 Ph\u00e1t H\u00e0nh', 'Nh\u00e0 cung c\u1ea5p'],
  ['Nh\u00e0 Ph\u00e1 H\u00e0nh', 'Nh\u00e0 cung c\u1ea5p'],
  ['C\u00f4ng ty ph\u00e1t h\u00e0nh', 'Nh\u00e0 cung c\u1ea5p'],
  ['T\u00e1c gi\u1ea3', 'T\u00e1c gi\u1ea3'],
  ['T\u00e1c Gi\u1ea3', 'T\u00e1c gi\u1ea3'],
  ['T\u00e1c gi\u1ea3 / D\u1ecbch gi\u1ea3', 'T\u00e1c gi\u1ea3 / D\u1ecbch gi\u1ea3'],
  ['T\u00e1c gi\u1ea3 D\u1ecbch gi\u1ea3', 'T\u00e1c gi\u1ea3 / D\u1ecbch gi\u1ea3'],
  ['Ng\u01b0\u1eddi D\u1ecbch', 'Ng\u01b0\u1eddi d\u1ecbch'],
  ['Ng\u01b0\u1eddi d\u1ecbch', 'Ng\u01b0\u1eddi d\u1ecbch'],
  ['D\u1ecbch gi\u1ea3', 'Ng\u01b0\u1eddi d\u1ecbch'],
  ['NXB', 'NXB'],
  ['Nh\u00e0 xu\u1ea5t b\u1ea3n', 'NXB'],
  ['N\u0103m XB', 'N\u0103m XB'],
  ['N\u0103m Xb', 'N\u0103m XB'],
  ['N\u0103m xu\u1ea5t b\u1ea3n', 'N\u0103m XB'],
  ['N\u0103m Xu\u1ea5t B\u1ea3n', 'N\u0103m XB'],
  ['Ng\u00e0y xu\u1ea5t b\u1ea3n', 'Ng\u00e0y xu\u1ea5t b\u1ea3n'],
  ['Ng\u00e0y Xu\u1ea5t B\u1ea3n', 'Ng\u00e0y xu\u1ea5t b\u1ea3n'],
  ['Ng\u00f4n Ng\u1eef', 'Ng\u00f4n ng\u1eef'],
  ['Ng\u00f4n ng\u1eef', 'Ng\u00f4n ng\u1eef'],
  ['Tr\u1ecdng l\u01b0\u1ee3ng (gr)', 'Tr\u1ecdng l\u01b0\u1ee3ng'],
  ['Tr\u1ecdng l\u01b0\u1ee3ng', 'Tr\u1ecdng l\u01b0\u1ee3ng'],
  ['Tr\u1ecdng L\u01b0\u1ee3ng', 'Tr\u1ecdng l\u01b0\u1ee3ng'],
  ['K\u00edch Th\u01b0\u1edbc Bao B\u00ec', 'K\u00edch th\u01b0\u1edbc'],
  ['K\u00edch th\u01b0\u1edbc bao b\u00ec', 'K\u00edch th\u01b0\u1edbc'],
  ['K\u00edch th\u01b0\u1edbc', 'K\u00edch th\u01b0\u1edbc'],
  ['K\u00edch Th\u01b0\u1edbc', 'K\u00edch th\u01b0\u1edbc'],
  ['Kh\u1ed5', 'K\u00edch th\u01b0\u1edbc'],
  ['Kh\u1ed5 s\u00e1ch', 'K\u00edch th\u01b0\u1edbc'],
  ['S\u1ed1 trang', 'S\u1ed1 trang'],
  ['S\u1ed1 Trang', 'S\u1ed1 trang'],
  ['H\u00ecnh th\u1ee9c', 'H\u00ecnh th\u1ee9c'],
  ['Gi\u00e1', 'Gi\u00e1'],
  ['Gi\u00e1 b\u00eca', 'Gi\u00e1'],
  ['T\u00ean s\u00e1ch', 'T\u00ean s\u00e1ch']
]);

const BLOCK_TAG_PATTERN = /<\/?(?:p|div|section|article|h[1-6]|ul|ol|table|thead|tbody|tfoot|blockquote)>/gi;
const LINE_BREAK_PATTERN = /<br\s*\/?>/gi;
const LIST_ITEM_OPEN_PATTERN = /<li[^>]*>/gi;
const LIST_ITEM_CLOSE_PATTERN = /<\/li>/gi;
const TABLE_ROW_CLOSE_PATTERN = /<\/tr>/gi;
const TABLE_CELL_OPEN_PATTERN = /<td[^>]*>/gi;
const TABLE_HEADER_OPEN_PATTERN = /<th[^>]*>/gi;
const TABLE_CELL_CLOSE_PATTERN = /<\/(?:td|th)>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;

const sleep = function (milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const ensureDirectory = async function (directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
};

const fetchWithRetry = async function (url, kind, headers = {}) {
  let attempt = 0;
  let lastError = null;

  while (attempt < FETCH_RETRY_LIMIT) {
    attempt += 1;

    try {
      const response = await fetch(url, {
        headers: {
          ...DEFAULT_HEADERS,
          ...headers
        }
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        const retryAfterSeconds = Number(response.headers.get('retry-after') || '0');
        const waitMilliseconds = retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : Math.min(2000 * (2 ** (attempt - 1)), 30000);

        lastError = new Error(`Failed to fetch ${kind} ${url}: ${response.status} ${response.statusText}`);

        if (attempt < FETCH_RETRY_LIMIT) {
          await sleep(waitMilliseconds);
          continue;
        }
      }

      throw new Error(`Failed to fetch ${kind} ${url}: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (attempt >= FETCH_RETRY_LIMIT) {
        break;
      }

      await sleep(Math.min(1500 * (2 ** (attempt - 1)), 15000));
    }
  }

  throw lastError || new Error(`Failed to fetch ${kind} ${url}`);
};

const fetchJson = async function (url) {
  const response = await fetchWithRetry(url, 'json');
  return response.json();
};

const fetchText = async function (url) {
  const response = await fetchWithRetry(url, 'html');
  return response.text();
};

const fetchBinary = async function (url) {
  const response = await fetchWithRetry(url, 'image', {
    referer: 'https://www.vinabook.com/'
  });

  return {
    binary: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || ''
  };
};

const escapeRegex = function (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const decodeHtmlEntities = function (value) {
  const namedEntities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  };

  return String(value || '').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, function (_, entity) {
    const normalizedEntity = entity.toLowerCase();

    if (normalizedEntity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(2), 16));
    }

    if (normalizedEntity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(1), 10));
    }

    return namedEntities[normalizedEntity] || _;
  });
};

const stripTags = function (value) {
  return decodeHtmlEntities(String(value || '').replace(HTML_TAG_PATTERN, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeText = function (value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const buildHtmlText = function (html) {
  return decodeHtmlEntities(
    String(html || '')
      .replace(LINE_BREAK_PATTERN, '\n')
      .replace(LIST_ITEM_OPEN_PATTERN, '\n- ')
      .replace(LIST_ITEM_CLOSE_PATTERN, '\n')
      .replace(TABLE_HEADER_OPEN_PATTERN, '')
      .replace(TABLE_CELL_OPEN_PATTERN, ': ')
      .replace(TABLE_CELL_CLOSE_PATTERN, '')
      .replace(TABLE_ROW_CLOSE_PATTERN, '\n')
      .replace(BLOCK_TAG_PATTERN, '\n')
      .replace(HTML_TAG_PATTERN, ' ')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const canonicalizeSpecLabel = function (label) {
  return SPEC_LABEL_ALIASES.get(String(label || '').trim()) || String(label || '').trim();
};

const buildSpecLinePattern = function () {
  const labels = [...SPEC_LABEL_ALIASES.keys()].sort((first, second) => second.length - first.length);
  return new RegExp(`^(${labels.map(escapeRegex).join('|')})\\s*[:\uff1a-]?\\s*(.+)$`, 'i');
};

const SPEC_LINE_PATTERN = buildSpecLinePattern();

const isLikelySpecValue = function (value, remainder) {
  const trimmedValue = String(value || '').trim().replace(/^[:\uff1a-]\s*/, '');
  const normalizedValue = normalizeText(trimmedValue);
  const hasExplicitSeparator = /^[\s]*[:\uff1a-]/.test(String(remainder || ''));

  if (!trimmedValue) {
    return false;
  }

  if (trimmedValue.length > 220) {
    return false;
  }

  if (!hasExplicitSeparator) {
    if (/[.!?]/.test(trimmedValue)) {
      return false;
    }

    if (trimmedValue.split(/\s+/).length > 14) {
      return false;
    }

    if (trimmedValue.length > 120) {
      return false;
    }

    if (/^(cho rang|la|neu|hay|trong|voi|theo|dong thoi|co rat|von di|khong quan trong)/.test(normalizedValue)) {
      return false;
    }
  }

  return true;
};

const parseSpecLine = function (line) {
  const match = String(line || '').match(SPEC_LINE_PATTERN);

  if (!match) {
    return null;
  }

  const remainder = String(line || '').slice(match[1].length);
  const value = match[2].trim().replace(/^[:\uff1a-]\s*/, '');

  if (!isLikelySpecValue(value, remainder)) {
    return null;
  }

  return {
    label: canonicalizeSpecLabel(match[1]),
    value
  };
};

const extractSpecsFromTable = function (html) {
  const specs = [];
  const tableRowPattern = /<tr[^>]*>\s*<th[^>]*>(.*?)<\/th>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gis;

  for (const match of String(html || '').matchAll(tableRowPattern)) {
    const rawLabel = stripTags(match[1]);
    const rawValue = stripTags(match[2]);

    if (!rawLabel || !rawValue) {
      continue;
    }

    specs.push({
      label: canonicalizeSpecLabel(rawLabel),
      value: rawValue
    });
  }

  return specs;
};

const extractSpecsFromText = function (text) {
  const lines = String(text || '')
    .split(/\n+/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const specs = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/^"+|"+$/g, '').trim();
    const normalizedLine = normalizeText(line);

    if (!line || normalizedLine === 'mo ta san pham') {
      continue;
    }

    if (normalizedLine.startsWith('thong tin chi tiet')) {
      const remainder = line.replace(/^Th\u00f4ng tin chi ti\u1ebft\s*:?\s*/i, '').trim();

      if (!remainder) {
        continue;
      }

      const parsedRemainder = parseSpecLine(remainder);

      if (parsedRemainder) {
        specs.push(parsedRemainder);
      }

      continue;
    }

    const parsedLine = parseSpecLine(line);

    if (parsedLine) {
      specs.push(parsedLine);
    }
  }

  return specs;
};

const dedupeSpecs = function (specs) {
  const map = new Map();

  specs.forEach((spec) => {
    if (!spec || !spec.label || !spec.value) {
      return;
    }

    map.set(spec.label, spec.value);
  });

  const orderedEntries = [];

  SPEC_LABEL_PRIORITY.forEach((label) => {
    if (map.has(label)) {
      orderedEntries.push({ label, value: map.get(label) });
      map.delete(label);
    }
  });

  map.forEach((value, label) => {
    orderedEntries.push({ label, value });
  });

  return orderedEntries;
};

const buildDescriptionHtml = function (html, title) {
  const cleanedSource = String(html || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/<h2>\s*M\u00f4 t\u1ea3 s\u1ea3n ph\u1ea9m\s*<\/h2>/i, '')
    .replace(/<h2>\s*Th\u00f4ng tin chi ti\u1ebft\s*<\/h2>[\s\S]*$/i, '')
    .replace(/<table[\s\S]*$/i, '');
  const text = buildHtmlText(cleanedSource);
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const titleKey = normalizeText(title);
  const contentLines = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/^"+|"+$/g, '').trim();
    const normalizedLine = normalizeText(line);

    if (!line) {
      continue;
    }

    if (normalizedLine === 'mo ta san pham' || normalizedLine.startsWith('thong tin chi tiet')) {
      continue;
    }

    if (normalizedLine === titleKey || normalizedLine === normalizeText(`"${title}"`)) {
      continue;
    }

    if (parseSpecLine(line)) {
      continue;
    }

    contentLines.push(line);
  }

  const htmlParts = [];
  let listItems = [];

  const flushList = function () {
    if (!listItems.length) {
      return;
    }

    htmlParts.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
    listItems = [];
  };

  contentLines.forEach((line) => {
    const bulletMatch = line.match(/^(?:[-\u2022]\s+|(?:\d+[\.\)])\s+)(.+)$/);
    const safeLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    if (bulletMatch) {
      listItems.push(
        bulletMatch[1]
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      );
      return;
    }

    flushList();
    htmlParts.push(`<p>${safeLine}</p>`);
  });

  flushList();

  return htmlParts.join('') || '<p>Product details were synced from the source catalog.</p>';
};

const buildExcerpt = function (descriptionHtml) {
  const text = stripTags(descriptionHtml);

  if (!text) {
    return 'Product details were synced from the source catalog.';
  }

  if (text.length <= 220) {
    return text;
  }

  return `${text.slice(0, 217).trimEnd()}...`;
};

const extractMetaContent = function (html, attributeName, attributeValue) {
  const pattern = new RegExp(`<meta[^>]+${attributeName}=["']${escapeRegex(attributeValue)}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = String(html || '').match(pattern);
  return match ? match[1] : '';
};

const inferExtension = function (url, contentType = '') {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();

  if (extension) {
    return extension;
  }

  if (contentType.includes('png')) {
    return '.png';
  }

  if (contentType.includes('webp')) {
    return '.webp';
  }

  if (contentType.includes('gif')) {
    return '.gif';
  }

  return '.jpg';
};

const normalizeImageUrl = function (value) {
  const rawValue = String(typeof value === 'object' && value ? value.src : value || '').trim();

  if (!rawValue) {
    return '';
  }

  if (rawValue.startsWith('//')) {
    return `https:${rawValue}`;
  }

  return rawValue;
};

const toPublicImagePath = function (publicImageBase, handle, index, extension) {
  return `${publicImageBase}/${handle}/${String(index + 1).padStart(2, '0')}${extension}`;
};

const buildDiscountLabel = function (price, compareAtPrice) {
  if (!(compareAtPrice > price) || price <= 0) {
    return '';
  }

  const discount = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return discount > 0 ? `-${discount}%` : '';
};

const buildDatasetSource = function (books, scriptName) {
  const timestamp = new Date().toISOString();
  return `const books = ${JSON.stringify(books, null, 2)};\n\n/* Auto-generated by ${scriptName} at ${timestamp}. */\n`;
};

const loadExistingDataset = async function (datasetOutputPath) {
  try {
    const source = await fs.readFile(datasetOutputPath, 'utf8');
    const match = source.match(DATASET_DECLARATION_PATTERN);
    return match ? JSON.parse(match[1]) : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const collectFilesRecursively = async function (directoryPath) {
  const items = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    const itemPath = path.resolve(directoryPath, item.name);

    if (item.isDirectory()) {
      files.push(...await collectFilesRecursively(itemPath));
      continue;
    }

    files.push(itemPath);
  }

  return files;
};

const pickFirstNonEmpty = function (...values) {
  return values.find((value) => String(value || '').trim()) || '';
};

const extractYear = function (value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '';
};

const getSpecValue = function (specs, labels) {
  const candidates = Array.isArray(labels) ? labels : [labels];

  for (const label of candidates) {
    const canonicalLabel = canonicalizeSpecLabel(label);
    const entry = specs.find((item) => item.label === canonicalLabel && item.value);

    if (entry) {
      return entry.value;
    }
  }

  return '';
};

const getVariantOptionValue = function (product, optionNames) {
  const targets = new Set((Array.isArray(optionNames) ? optionNames : [optionNames]).map((value) => normalizeText(value)));
  const firstVariant = product.variants?.[0] || null;
  const firstVariantOptions = Array.isArray(firstVariant?.options) ? firstVariant.options : [];
  const options = Array.isArray(product.options) ? product.options : [];

  for (const [index, option] of options.entries()) {
    const optionName = typeof option === 'string' ? option : option?.name;

    if (!targets.has(normalizeText(optionName))) {
      continue;
    }

    const optionByIndex = String(firstVariantOptions[index] || '').trim();

    if (optionByIndex) {
      return optionByIndex;
    }

    const position = Number(option?.position || 0);
    const positionalValues = [firstVariant?.option1, firstVariant?.option2, firstVariant?.option3];
    const optionByPosition = position > 0 ? String(positionalValues[position - 1] || '').trim() : '';

    if (optionByPosition) {
      return optionByPosition;
    }

    if (Array.isArray(option?.values) && option.values.length) {
      const fallbackValue = String(option.values[0] || '').trim();

      if (fallbackValue) {
        return fallbackValue;
      }
    }
  }

  return '';
};

const resolveAuthor = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['T\u00e1c gi\u1ea3']),
    getSpecValue(specs, ['T\u00e1c gi\u1ea3 / D\u1ecbch gi\u1ea3']),
    getVariantOptionValue(product, ['T\u00e1c gi\u1ea3'])
  );
};

const resolveTranslator = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['Ng\u01b0\u1eddi d\u1ecbch']),
    getVariantOptionValue(product, ['Ng\u01b0\u1eddi d\u1ecbch', 'D\u1ecbch gi\u1ea3'])
  );
};

const resolveSupplier = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['Nh\u00e0 cung c\u1ea5p']),
    getVariantOptionValue(product, ['Nh\u00e0 ph\u00e1t h\u00e0nh', 'Nh\u00e0 Ph\u00e1t H\u00e0nh', 'Nh\u00e0 Ph\u00e1 H\u00e0nh', 'Nh\u00e0 cung c\u1ea5p']),
    product.vendor
  );
};

const resolvePublishingHouse = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['NXB']),
    getVariantOptionValue(product, ['NXB', 'Nh\u00e0 xu\u1ea5t b\u1ea3n'])
  );
};

const resolveYear = function (product, specs) {
  const rawYear = pickFirstNonEmpty(
    getSpecValue(specs, ['N\u0103m XB']),
    extractYear(getSpecValue(specs, ['D\u1ef1 ki\u1ebfn c\u00f3 h\u00e0ng', 'Ng\u00e0y xu\u1ea5t b\u1ea3n'])),
    extractYear(getVariantOptionValue(product, ['N\u0103m XB', 'N\u0103m Xu\u1ea5t B\u1ea3n', 'N\u0103m Xb'])),
    extractYear(product.published_at)
  );

  return extractYear(rawYear) || String(rawYear || '').trim();
};

const resolveSku = function (product, specs) {
  const firstVariant = product.variants?.[0] || {};

  return pickFirstNonEmpty(
    getSpecValue(specs, ['M\u00e3 h\u00e0ng', 'Code', 'Barcode - ISBN', 'ISBN']),
    firstVariant.barcode,
    firstVariant.sku
  );
};

const resolveLanguage = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['Ng\u00f4n ng\u1eef']),
    getVariantOptionValue(product, ['Ng\u00f4n ng\u1eef', 'Ng\u00f4n Ng\u1eef'])
  );
};

const resolvePages = function (product, specs, year) {
  const specPages = getSpecValue(specs, ['S\u1ed1 trang']);

  if (specPages) {
    return specPages;
  }

  const optionPages = getVariantOptionValue(product, ['S\u1ed1 Trang', 'S\u1ed1 trang']);

  if (optionPages && optionPages !== year) {
    return optionPages;
  }

  return '';
};

const resolveWeight = function (product, specs) {
  const specWeight = getSpecValue(specs, ['Tr\u1ecdng l\u01b0\u1ee3ng']);

  if (specWeight) {
    return specWeight;
  }

  const firstVariant = product.variants?.[0] || {};
  return firstVariant.weight ? String(firstVariant.weight).trim() : '';
};

const resolveSize = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['K\u00edch th\u01b0\u1edbc']),
    getVariantOptionValue(product, ['K\u00edch th\u01b0\u1edbc', 'Kh\u1ed5', 'Kh\u1ed5 s\u00e1ch'])
  );
};

const resolveBookType = function (product, specs) {
  return pickFirstNonEmpty(
    getSpecValue(specs, ['H\u00ecnh th\u1ee9c']),
    product.type
  );
};

const buildDerivedSpecs = function (fields) {
  return [
    { label: 'M\u00e3 h\u00e0ng', value: fields.sku },
    { label: 'Nh\u00e0 cung c\u1ea5p', value: fields.publisher },
    { label: 'T\u00e1c gi\u1ea3', value: fields.author },
    { label: 'Ng\u01b0\u1eddi d\u1ecbch', value: fields.translator },
    { label: 'NXB', value: fields.publishingHouse },
    { label: 'N\u0103m XB', value: fields.year },
    { label: 'Ng\u00f4n ng\u1eef', value: fields.language },
    { label: 'Tr\u1ecdng l\u01b0\u1ee3ng', value: fields.weight },
    { label: 'K\u00edch th\u01b0\u1edbc', value: fields.size },
    { label: 'S\u1ed1 trang', value: fields.pages },
    { label: 'H\u00ecnh th\u1ee9c', value: fields.bookType }
  ];
};

const collectCandidateImageUrls = async function (product, sourceUrl, fallbackToHtmlMetaImages) {
  const candidateUrls = [];

  const pushCandidate = function (value) {
    const imageUrl = normalizeImageUrl(value);

    if (!imageUrl || candidateUrls.includes(imageUrl)) {
      return;
    }

    candidateUrls.push(imageUrl);
  };

  (product.images || []).forEach(pushCandidate);
  pushCandidate(product.featured_image);
  pushCandidate(product.image);

  if (candidateUrls.length || !fallbackToHtmlMetaImages) {
    return candidateUrls;
  }

  const html = await fetchText(sourceUrl);
  pushCandidate(extractMetaContent(html, 'property', 'og:image:secure_url'));
  pushCandidate(extractMetaContent(html, 'property', 'og:image'));
  pushCandidate(extractMetaContent(html, 'name', 'twitter:image'));

  return candidateUrls;
};

const replaceSubcategorySlice = function (existingBooks, nextBooks, subcategorySlug) {
  const result = [];
  let inserted = false;

  existingBooks.forEach((book) => {
    if (String(book.subcategory || '').trim() === subcategorySlug) {
      if (!inserted) {
        result.push(...nextBooks);
        inserted = true;
      }

      return;
    }

    result.push(book);
  });

  if (!inserted) {
    result.push(...nextBooks);
  }

  return result;
};

const replaceBooksByHandle = function (existingBooks, nextBooks) {
  const nextBookMap = new Map(nextBooks.map((book) => [book.handle, book]));
  const existingHandleSet = new Set(existingBooks.map((book) => book.handle));
  const mergedBooks = existingBooks.map((book) => nextBookMap.get(book.handle) || book);

  nextBooks.forEach((book) => {
    if (!existingHandleSet.has(book.handle)) {
      mergedBooks.push(book);
    }
  });

  return mergedBooks;
};

const belongsToCurrentSlice = function (book, categoryLabel, subcategorySlug) {
  return String(book.category || '').trim() === categoryLabel
    && String(book.subcategory || '').trim() === subcategorySlug;
};

const replaceBooksByTargetHandles = function (existingBooks, nextBooks, options) {
  const {
    targetHandles,
    pruneHandles,
    categoryLabel,
    subcategorySlug,
    targetHandleScope = 'slice'
  } = options;
  const result = [];
  let inserted = false;

  existingBooks.forEach((book) => {
    const handle = String(book.handle || '').trim();
    const inTargetSet = targetHandles.has(handle) || pruneHandles.has(handle);
    const canReplace = targetHandleScope === 'all'
      ? inTargetSet
      : (inTargetSet && belongsToCurrentSlice(book, categoryLabel, subcategorySlug));

    if (canReplace) {
      if (!inserted) {
        result.push(...nextBooks);
        inserted = true;
      }

      return;
    }

    result.push(book);
  });

  if (!inserted) {
    result.push(...nextBooks);
  }

  return result;
};

const mergeBooks = function (existingBooks, nextBooks, options) {
  switch (options.mergeStrategy) {
    case 'byHandle':
      return replaceBooksByHandle(existingBooks, nextBooks);
    case 'replaceTargetHandles':
      return replaceBooksByTargetHandles(existingBooks, nextBooks, options);
    case 'replaceSubcategorySlice':
    default:
      return replaceSubcategorySlice(existingBooks, nextBooks, options.subcategorySlug);
  }
};

const collectProductRecord = async function (sourceUrl, context) {
  const product = await fetchJson(`${sourceUrl}.js`);
  const productDirectory = path.resolve(context.imagesRoot, product.handle);

  if (context.skipSoldOut && !product.available) {
    await fs.rm(productDirectory, { recursive: true, force: true });
    return null;
  }

  if (context.clearProductDirectoryBeforeWrite) {
    await fs.rm(productDirectory, { recursive: true, force: true });
  }

  await ensureDirectory(productDirectory);

  const gallery = [];
  const candidateImageUrls = await collectCandidateImageUrls(product, sourceUrl, context.fallbackToHtmlMetaImages);

  for (const [index, rawImageUrl] of candidateImageUrls.entries()) {
    const imageUrl = normalizeImageUrl(rawImageUrl);

    if (!imageUrl) {
      continue;
    }

    const { binary, contentType } = await fetchBinary(imageUrl);
    const extension = inferExtension(imageUrl, contentType);
    const fileName = `${String(index + 1).padStart(2, '0')}${extension}`;
    const localPath = path.resolve(productDirectory, fileName);
    const publicPath = toPublicImagePath(context.publicImageBase, product.handle, index, extension);

    await fs.writeFile(localPath, binary);
    gallery.push(publicPath);
  }

  const descriptionSource = product.description || product.content || product.metadescription || '';
  const descriptionHtml = buildDescriptionHtml(descriptionSource, product.title);
  const extractedSpecs = dedupeSpecs([
    ...extractSpecsFromTable(descriptionSource),
    ...extractSpecsFromText(buildHtmlText(descriptionSource))
  ]);
  const price = Math.round(Number(product.price || product.variants?.[0]?.price || 0) / 100);
  const rawCompareAtPrice = Math.round(Number(product.compare_at_price || product.variants?.[0]?.compare_at_price || 0) / 100);
  const compareAtPrice = rawCompareAtPrice > price ? rawCompareAtPrice : 0;
  const author = resolveAuthor(product, extractedSpecs);
  const translator = resolveTranslator(product, extractedSpecs);
  const publisher = resolveSupplier(product, extractedSpecs);
  const publishingHouse = resolvePublishingHouse(product, extractedSpecs);
  const year = resolveYear(product, extractedSpecs);
  const sku = resolveSku(product, extractedSpecs);
  const language = resolveLanguage(product, extractedSpecs);
  const pages = resolvePages(product, extractedSpecs, year);
  const weight = resolveWeight(product, extractedSpecs);
  const size = resolveSize(product, extractedSpecs);
  const bookType = resolveBookType(product, extractedSpecs);
  const specs = dedupeSpecs([
    ...extractedSpecs,
    ...buildDerivedSpecs({
      sku,
      publisher,
      author,
      translator,
      publishingHouse,
      year,
      language,
      weight,
      size,
      pages,
      bookType
    })
  ]);

  return {
    id: Number(product.id),
    ...(context.includeSourceProductId ? { sourceProductId: Number(product.id) } : {}),
    handle: product.handle,
    sourceUrl,
    title: String(product.title || '').trim(),
    author,
    publisher,
    year,
    sku,
    bookType,
    language,
    pages,
    weight,
    size,
    price,
    compareAtPrice,
    discountLabel: buildDiscountLabel(price, compareAtPrice),
    isSoldOut: context.skipSoldOut ? false : !Boolean(product.available),
    category: context.categoryLabel,
    subcategory: context.subcategorySlug,
    listingStyle: 'collection',
    image: gallery[0] || '',
    gallery,
    description: buildExcerpt(descriptionHtml),
    descriptionHtml,
    specs
  };
};

export const runLegacyJsonProductImport = async function (scriptUrl, config) {
  const callerFilePath = fileURLToPath(scriptUrl);
  const callerDirectory = path.dirname(callerFilePath);
  const repoRoot = path.resolve(callerDirectory, '..', '..', '..');
  const datasetOutputPath = path.resolve(repoRoot, 'tools', 'catalog', 'source', 'books-data.legacy.js');
  const filesListPath = path.resolve(repoRoot, 'tools', 'catalog', 'state', config.filesListName);
  const imagesRoot = path.resolve(repoRoot, ...config.imagesRootSegments);
  const publicImageBase = `./${config.imagesRootSegments.join('/')}`;
  const targetHandles = new Set((config.sourceUrls || []).map((sourceUrl) => {
    return new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1);
  }).filter(Boolean));
  const pruneHandles = new Set(config.pruneHandles || []);
  const context = {
    imagesRoot,
    publicImageBase,
    categoryLabel: String(config.categoryLabel || '').trim(),
    subcategorySlug: String(config.subcategorySlug || '').trim(),
    skipSoldOut: Boolean(config.skipSoldOut),
    clearProductDirectoryBeforeWrite: Boolean(config.clearProductDirectoryBeforeWrite),
    fallbackToHtmlMetaImages: Boolean(config.fallbackToHtmlMetaImages),
    includeSourceProductId: Boolean(config.includeSourceProductId)
  };

  if (config.resetImagesRootBeforeRun) {
    await fs.rm(imagesRoot, { recursive: true, force: true });
  }

  await ensureDirectory(imagesRoot);
  await ensureDirectory(path.dirname(datasetOutputPath));
  await ensureDirectory(path.dirname(filesListPath));

  const books = [];
  const skippedHandles = [];

  for (const sourceUrl of config.sourceUrls || []) {
    const record = await collectProductRecord(sourceUrl, context);

    if (!record) {
      const skippedHandle = new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) || sourceUrl;
      skippedHandles.push(skippedHandle);
      console.log(`Skipped sold out ${skippedHandle}`);
      continue;
    }

    books.push(record);
    console.log(`Imported ${record.handle} (${record.gallery.length} images)`);
  }

  for (const handle of pruneHandles) {
    await fs.rm(path.resolve(imagesRoot, handle), { recursive: true, force: true });
  }

  const existingBooks = await loadExistingDataset(datasetOutputPath);
  const nextBooks = mergeBooks(existingBooks, books, {
    mergeStrategy: config.mergeStrategy || 'replaceSubcategorySlice',
    subcategorySlug: context.subcategorySlug,
    categoryLabel: context.categoryLabel,
    targetHandles,
    pruneHandles,
    targetHandleScope: config.targetHandleScope || 'slice'
  });
  const datasetSource = buildDatasetSource(nextBooks, path.basename(callerFilePath));
  const trackedFiles = (await collectFilesRecursively(imagesRoot))
    .map((filePath) => path.relative(repoRoot, filePath).replace(/\\/g, '/'))
    .sort((first, second) => first.localeCompare(second));

  await fs.writeFile(datasetOutputPath, datasetSource, 'utf8');
  await fs.writeFile(filesListPath, `${trackedFiles.join('\n')}\n`, 'utf8');

  const totalImages = books.reduce((sum, book) => sum + book.gallery.length, 0);
  console.log(`Done: ${books.length} ${config.subcategoryLabel || context.subcategorySlug} books / ${totalImages} images`);

  if (skippedHandles.length) {
    console.log(`Skipped sold-out handles: ${skippedHandles.join(', ')}`);
  }
};
