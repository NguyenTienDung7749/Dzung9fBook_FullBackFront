import fs from 'node:fs/promises';
import path from 'node:path';

import {
  SITE_ORIGIN,
  allocateUniqueBookIds,
  buildCollectionKey,
  buildDiscountLabel,
  buildExcerpt,
  buildLegacyDatasetSource,
  buildPublicImagePath,
  collectFilesRecursively,
  ensureDirectory,
  extractEntriesFromCollectionPage,
  extractHandlesFromCollectionPage,
  fetchBinary,
  fetchJson,
  fetchText,
  inferExtension,
  loadLegacyDataset,
  normalizeImageUrl,
  resolveLegacyPaths,
  resolveProductPages,
  resolveProductYear
} from './collection-import-support.mjs';

const IMAGE_FETCH_HEADERS = {
  referer: `${SITE_ORIGIN}/`
};

const buildLogPrefix = function (config, logScope) {
  if (typeof logScope === 'function') {
    return String(logScope(config) || '').trim();
  }

  if (logScope === 'subcategory') {
    return `[${config.subcategorySlug}]`;
  }

  return `[${config.categoryLabel} / ${config.subcategorySlug}]`;
};

const collectProductRecord = async function (entry, config, runtimeContext) {
  const handle = typeof entry === 'string' ? entry : String(entry?.handle || '').trim();
  const collectionImageUrl = typeof entry === 'string' ? '' : String(entry?.collectionImageUrl || '').trim();
  const product = await fetchJson(`${SITE_ORIGIN}/products/${handle}.js`);
  const firstVariant = product.variants?.[0] || {};
  const sourceProductId = Number(product.id);
  const price = Math.round(Number(product.price || firstVariant.price || 0) / 100);
  const rawCompareAtPrice = Math.round(Number(product.compare_at_price || firstVariant.compare_at_price || 0) / 100);
  const compareAtPrice = rawCompareAtPrice > price ? rawCompareAtPrice : 0;
  const year = resolveProductYear(product);
  const pages = resolveProductPages(product, year);
  const imagesRoot = path.resolve(runtimeContext.repoRoot, ...config.imagesRootRelative);
  const primaryImageUrl = normalizeImageUrl(
    product.featured_image
    || product.images?.[0]
    || (runtimeContext.useCollectionImageFallback ? collectionImageUrl : '')
    || ''
  );

  let image = '';
  let gallery = [];

  if (primaryImageUrl) {
    const productDirectory = path.resolve(imagesRoot, handle);
    await ensureDirectory(productDirectory);

    const { binary, contentType } = await fetchBinary(primaryImageUrl, IMAGE_FETCH_HEADERS);
    const extension = inferExtension(primaryImageUrl, contentType);
    const localPath = path.resolve(productDirectory, `01${extension}`);
    image = buildPublicImagePath(config, handle, extension);
    gallery = [image];

    await fs.writeFile(localPath, binary);
  }

  const record = {
    id: sourceProductId,
    handle: product.handle,
    sourceUrl: new URL(product.url || `/products/${product.handle}`, SITE_ORIGIN).toString(),
    title: String(product.title || '').trim(),
    author: '',
    publisher: String(product.vendor || '').trim(),
    year,
    sku: String(firstVariant.barcode || firstVariant.sku || '').trim(),
    bookType: String(product.type || '').trim(),
    language: '',
    pages,
    weight: firstVariant.weight ? String(firstVariant.weight).trim() : '',
    size: '',
    price,
    compareAtPrice,
    discountLabel: buildDiscountLabel(price, compareAtPrice),
    isSoldOut: !Boolean(product.available),
    category: config.categoryLabel,
    subcategory: config.subcategorySlug,
    listingStyle: 'collection',
    detailPending: true,
    image,
    gallery,
    description: buildExcerpt(product.description || product.content || product.metadescription || product.title, product.title),
    descriptionHtml: '',
    specs: []
  };

  if (runtimeContext.includeSourceProductId) {
    record.sourceProductId = sourceProductId;
  }

  return record;
};

const importCollection = async function (config, runtimeContext) {
  const imagesRoot = path.resolve(runtimeContext.repoRoot, ...config.imagesRootRelative);
  const filesListPath = path.resolve(runtimeContext.repoRoot, 'tools', 'catalog', 'state', config.filesListName);
  const items = [];
  const seen = new Set();

  for (const url of config.pageUrls) {
    const html = await fetchText(url);
    const pageItems = runtimeContext.pageEntryMode === 'entries'
      ? extractEntriesFromCollectionPage(html, url)
      : extractHandlesFromCollectionPage(html, url);

    for (const pageItem of pageItems) {
      const handle = typeof pageItem === 'string' ? pageItem : pageItem.handle;

      if (seen.has(handle)) {
        continue;
      }

      seen.add(handle);
      items.push(pageItem);
    }
  }

  await fs.rm(imagesRoot, { recursive: true, force: true });
  await ensureDirectory(imagesRoot);
  await ensureDirectory(path.dirname(filesListPath));

  const records = [];
  const logPrefix = buildLogPrefix(config, runtimeContext.logScope);

  for (const item of items) {
    const record = await collectProductRecord(item, config, runtimeContext);
    records.push(record);
    console.log(`${logPrefix} Imported ${record.handle}${record.isSoldOut ? ' (Het hang)' : ''}`);
  }

  const trackedFiles = (await collectFilesRecursively(imagesRoot))
    .map((filePath) => path.relative(runtimeContext.repoRoot, filePath).replace(/\\/g, '/'))
    .sort((first, second) => first.localeCompare(second));

  await fs.writeFile(filesListPath, `${trackedFiles.join('\n')}\n`, 'utf8');

  return records;
};

const buildMergedDataset = function (existingBooks, importedGroups, runtimeContext) {
  const importedRecords = importedGroups.flatMap((group) => group.records);

  if (runtimeContext.mergeStrategy === 'replaceBySubcategory') {
    const excludedSlugs = new Set(importedGroups.map((group) => group.config.subcategorySlug));
    const preservedBooks = existingBooks.filter((book) => !excludedSlugs.has(String(book.subcategory || '').trim()));

    return [...preservedBooks, ...importedRecords];
  }

  const excludedKeys = new Set(
    importedGroups.map((group) => buildCollectionKey(group.config.categoryLabel, group.config.subcategorySlug))
  );
  const preservedBooks = existingBooks.filter(
    (book) => !excludedKeys.has(buildCollectionKey(book.category, book.subcategory))
  );

  if (!runtimeContext.allocateUniqueIds) {
    return [...preservedBooks, ...importedRecords];
  }

  return [...preservedBooks, ...allocateUniqueBookIds(importedRecords, preservedBooks)];
};

export const runLegacyCollectionImport = async function (callerUrl, options) {
  const {
    collectionConfigs,
    pageEntryMode = 'handles',
    mergeStrategy = 'replaceByCategorySubcategory',
    allocateUniqueIds = false,
    includeSourceProductId = false,
    useCollectionImageFallback = false,
    logScope = 'categorySubcategory'
  } = options;
  const paths = resolveLegacyPaths(callerUrl);
  const runtimeContext = {
    ...paths,
    pageEntryMode,
    mergeStrategy,
    allocateUniqueIds,
    includeSourceProductId,
    useCollectionImageFallback,
    logScope
  };
  const importedGroups = [];

  for (const config of collectionConfigs) {
    importedGroups.push({
      config,
      records: await importCollection(config, runtimeContext)
    });
  }

  const existingBooks = await loadLegacyDataset(paths.datasetOutputPath);
  const nextBooks = buildMergedDataset(existingBooks, importedGroups, runtimeContext);

  await fs.writeFile(
    paths.datasetOutputPath,
    buildLegacyDatasetSource(nextBooks, paths.currentFilePath),
    'utf8'
  );

  for (const group of importedGroups) {
    const logPrefix = buildLogPrefix(group.config, logScope);
    console.log(`${logPrefix} Done: ${group.records.length} collection items`);
  }
};
