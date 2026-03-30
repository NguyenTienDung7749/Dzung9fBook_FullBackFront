import fs from 'node:fs/promises';

import { buildLegacyDatasetSource, loadLegacyDataset, resolveLegacyPaths } from './collection-import-support.mjs';

const escapeHtml = function (value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const buildDescriptionHtml = function (paragraphs) {
  return (Array.isArray(paragraphs) ? paragraphs : [])
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
};

const buildExcerpt = function (descriptionHtml) {
  const text = String(descriptionHtml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= 240) {
    return text;
  }

  return `${text.slice(0, 237).trimEnd()}...`;
};

export const runLegacyDescriptionOverrides = async function (scriptUrl, options) {
  const { descriptionOverrides } = options;
  const paths = resolveLegacyPaths(scriptUrl);
  const books = await loadLegacyDataset(paths.datasetOutputPath);
  let updatedCount = 0;

  for (const [handle, override] of Object.entries(descriptionOverrides || {})) {
    const book = books.find((item) => item.handle === handle);

    if (!book) {
      throw new Error(`Book not found for handle: ${handle}`);
    }

    const descriptionHtml = buildDescriptionHtml(override?.paragraphs || []);
    book.descriptionHtml = descriptionHtml;
    book.description = buildExcerpt(descriptionHtml);
    updatedCount += 1;
  }

  await fs.writeFile(
    paths.datasetOutputPath,
    buildLegacyDatasetSource(books, paths.currentFilePath),
    'utf8'
  );

  console.log(`Backfilled descriptions for ${updatedCount} books.`);
};
