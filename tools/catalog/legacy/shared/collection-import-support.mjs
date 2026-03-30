import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_ORIGIN = 'https://www.vinabook.com';

const DATASET_DECLARATION_PATTERN = /const books = (\[[\s\S]*\]);\s*(?:\/\*[\s\S]*\*\/\s*)?$/;
const COLLECTION_SECTION_START = 'content-product-list product-list filter clearfix';
const COLLECTION_SECTION_END = '<div class="sortpagibar pagi clearfix text-center">';
const PRODUCT_LINK_PATTERN = /<h3 class="pro-name">\s*<a href="(\/products\/[^"]+)"/g;
const PRODUCT_CARD_PATTERN = /<div class="product-item">[\s\S]*?<a href="(\/products\/[^"]+)">[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"/g;
const FETCH_RETRY_LIMIT = 6;
const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*'
};

export const resolveLegacyPaths = function (callerUrl) {
  const currentFilePath = fileURLToPath(callerUrl);
  const scriptDirectory = path.dirname(currentFilePath);
  const repoRoot = path.resolve(scriptDirectory, '..', '..', '..');
  const datasetOutputPath = path.resolve(repoRoot, 'tools', 'catalog', 'source', 'books-data.legacy.js');

  return {
    currentFilePath,
    scriptDirectory,
    repoRoot,
    datasetOutputPath
  };
};

export const sleep = function (milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const ensureDirectory = async function (directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
};

export const fetchWithRetry = async function (url, kind, headers = {}) {
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

export const fetchText = async function (url, headers = {}) {
  const response = await fetchWithRetry(url, 'text', headers);
  return response.text();
};

export const fetchJson = async function (url, headers = {}) {
  const response = await fetchWithRetry(url, 'json', headers);
  return response.json();
};

export const fetchBinary = async function (url, headers = {}) {
  const response = await fetchWithRetry(url, 'image', headers);
  const bytes = await response.arrayBuffer();

  return {
    binary: Buffer.from(bytes),
    contentType: response.headers.get('content-type') || ''
  };
};

export const decodeHtmlEntities = function (value) {
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

export const stripTags = function (value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const buildExcerpt = function (html, fallbackTitle, maxLength = 210) {
  const plainText = stripTags(html);

  if (!plainText) {
    return `${fallbackTitle} dang duoc dong bo cho collection local.`;
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`;
};

export const buildDiscountLabel = function (price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) {
    return '';
  }

  const discount = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return discount > 0 ? `-${discount}%` : '';
};

export const inferExtension = function (url, contentType = '') {
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

export const loadLegacyDataset = async function (datasetOutputPath) {
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

export const buildLegacyDatasetSource = function (books, generatorFilePath) {
  const timestamp = new Date().toISOString();
  return `const books = ${JSON.stringify(books, null, 2)};\n\n/* Auto-generated by ${path.basename(generatorFilePath)} at ${timestamp}. */\n`;
};

export const collectFilesRecursively = async function (directoryPath) {
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

const normalizeProductHandle = function (value) {
  return String(value || '').trim().replace(/^\/products\//, '').replace(/\/+$/, '');
};

export const extractHandlesFromCollectionPage = function (html, url) {
  const startIndex = String(html || '').indexOf(COLLECTION_SECTION_START);

  if (startIndex < 0) {
    throw new Error(`Could not find collection section in ${url}`);
  }

  const endIndex = html.indexOf(COLLECTION_SECTION_END, startIndex);
  const section = endIndex >= 0 ? html.slice(startIndex, endIndex) : html.slice(startIndex);
  const handles = [];
  const seen = new Set();

  for (const match of section.matchAll(PRODUCT_LINK_PATTERN)) {
    const handle = normalizeProductHandle(match[1]);

    if (!handle || seen.has(handle)) {
      continue;
    }

    seen.add(handle);
    handles.push(handle);
  }

  return handles;
};

export const normalizeImageUrl = function (value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  if (rawValue.startsWith('//')) {
    return `https:${rawValue}`;
  }

  return rawValue;
};

export const extractEntriesFromCollectionPage = function (html, url) {
  const startIndex = String(html || '').indexOf(COLLECTION_SECTION_START);

  if (startIndex < 0) {
    throw new Error(`Could not find collection section in ${url}`);
  }

  const endIndex = html.indexOf(COLLECTION_SECTION_END, startIndex);
  const section = endIndex >= 0 ? html.slice(startIndex, endIndex) : html.slice(startIndex);
  const entries = [];
  const seen = new Set();

  for (const match of section.matchAll(PRODUCT_CARD_PATTERN)) {
    const handle = normalizeProductHandle(match[1]);
    const imageUrl = normalizeImageUrl(match[2] || '');

    if (!handle || seen.has(handle)) {
      continue;
    }

    seen.add(handle);
    entries.push({
      handle,
      collectionImageUrl: imageUrl
    });
  }

  if (entries.length) {
    return entries;
  }

  for (const match of section.matchAll(PRODUCT_LINK_PATTERN)) {
    const handle = normalizeProductHandle(match[1]);

    if (!handle || seen.has(handle)) {
      continue;
    }

    seen.add(handle);
    entries.push({
      handle,
      collectionImageUrl: ''
    });
  }

  return entries;
};

export const resolveProductYear = function (product) {
  const firstVariant = product.variants?.[0] || null;
  const options = [
    firstVariant?.option1,
    firstVariant?.option2,
    firstVariant?.option3,
    ...(Array.isArray(firstVariant?.options) ? firstVariant.options : [])
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return options.find((value) => /^\d{4}$/.test(value)) || '';
};

export const resolveProductPages = function (product, year) {
  const firstVariant = product.variants?.[0] || null;
  const options = [
    firstVariant?.option1,
    firstVariant?.option2,
    firstVariant?.option3,
    ...(Array.isArray(firstVariant?.options) ? firstVariant.options : [])
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return options.find((value) => /^\d{2,4}$/.test(value) && value !== year) || '';
};

export const buildPublicImagePath = function (config, handle, extension) {
  return `./${[...config.imagesRootRelative, handle, `01${extension}`].join('/')}`;
};

export const buildCollectionKey = function (categoryLabel, subcategorySlug) {
  return `${String(categoryLabel || '').trim()}::${String(subcategorySlug || '').trim()}`;
};

export const allocateUniqueBookIds = function (records, preservedBooks) {
  const usedIds = new Set(
    preservedBooks
      .map((book) => Number(book.id))
      .filter((bookId) => Number.isSafeInteger(bookId))
  );

  return records.map((record) => {
    const originalId = Number(record.sourceProductId || record.id);
    let candidate = originalId;

    if (!Number.isSafeInteger(candidate) || usedIds.has(candidate)) {
      let suffix = 1;

      do {
        candidate = Number(`${originalId}${suffix}`);
        suffix += 1;
      } while (!Number.isSafeInteger(candidate) || usedIds.has(candidate));
    }

    usedIds.add(candidate);

    return {
      ...record,
      id: candidate
    };
  });
};

export const hasLocalImageAsset = async function (repoRoot, publicPath) {
  const relativePath = String(publicPath || '').trim().replace(/^\.\//, '');

  if (!relativePath) {
    return false;
  }

  try {
    await fs.access(path.resolve(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
};
