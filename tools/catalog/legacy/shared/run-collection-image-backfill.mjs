import fs from 'node:fs/promises';
import path from 'node:path';

import { SITE_ORIGIN, buildLegacyDatasetSource, buildPublicImagePath, collectFilesRecursively, ensureDirectory, extractEntriesFromCollectionPage, fetchBinary, fetchText, hasLocalImageAsset, inferExtension, loadLegacyDataset, resolveLegacyPaths } from './collection-import-support.mjs';

const IMAGE_FETCH_HEADERS = {
  referer: `${SITE_ORIGIN}/`
};

export const runLegacyCollectionImageBackfill = async function (callerUrl, options) {
  const { collectionConfigs } = options;
  const paths = resolveLegacyPaths(callerUrl);
  const books = await loadLegacyDataset(paths.datasetOutputPath);

  for (const config of collectionConfigs) {
    const imagesRoot = path.resolve(paths.repoRoot, ...config.imagesRootRelative);
    const filesListPath = path.resolve(paths.repoRoot, 'tools', 'catalog', 'state', config.filesListName);
    const entries = [];
    const seen = new Set();

    for (const url of config.pageUrls) {
      const html = await fetchText(url);
      const pageEntries = extractEntriesFromCollectionPage(html, url);

      for (const entry of pageEntries) {
        if (seen.has(entry.handle)) {
          continue;
        }

        seen.add(entry.handle);
        entries.push(entry);
      }
    }

    await ensureDirectory(imagesRoot);
    await ensureDirectory(path.dirname(filesListPath));

    const entryMap = new Map(entries.map((entry) => [entry.handle, entry.collectionImageUrl]));
    const collectionBooks = books.filter(
      (book) => book.category === config.categoryLabel && book.subcategory === config.subcategorySlug
    );
    let updatedCount = 0;

    for (const book of collectionBooks) {
      if (await hasLocalImageAsset(paths.repoRoot, book.image)) {
        continue;
      }

      const imageUrl = entryMap.get(book.handle);

      if (!imageUrl) {
        continue;
      }

      const productDirectory = path.resolve(imagesRoot, book.handle);
      await ensureDirectory(productDirectory);

      const { binary, contentType } = await fetchBinary(imageUrl, IMAGE_FETCH_HEADERS);
      const extension = inferExtension(imageUrl, contentType);
      const localPath = path.resolve(productDirectory, `01${extension}`);
      const publicPath = buildPublicImagePath(config, book.handle, extension);

      await fs.writeFile(localPath, binary);

      book.image = publicPath;
      book.gallery = [publicPath];
      updatedCount += 1;
      console.log(`[${config.categoryLabel} / ${config.subcategorySlug}] Synced ${book.handle}`);
    }

    const trackedFiles = (await collectFilesRecursively(imagesRoot))
      .map((filePath) => path.relative(paths.repoRoot, filePath).replace(/\\/g, '/'))
      .sort((first, second) => first.localeCompare(second));

    await fs.writeFile(filesListPath, `${trackedFiles.join('\n')}\n`, 'utf8');
    console.log(`[${config.categoryLabel} / ${config.subcategorySlug}] Updated missing images: ${updatedCount}`);
  }

  await fs.writeFile(
    paths.datasetOutputPath,
    buildLegacyDatasetSource(books, paths.currentFilePath),
    'utf8'
  );
};
