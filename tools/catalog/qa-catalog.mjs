import fs from 'node:fs/promises';
import path from 'node:path';
import { catalogOutputPaths, publicRuntimePaths } from './config/collections.mjs';

const assert = function (condition, message) {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = async function (filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
};

const fileExists = async function (filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const toLocalPath = function (relativeAssetPath) {
  if (/^(?:https?:)?\/\//i.test(relativeAssetPath) || relativeAssetPath.startsWith('data:')) {
    return '';
  }

  return path.resolve(publicRuntimePaths.root, relativeAssetPath.replace(/^\.\//, ''));
};

const main = async function () {
  const categories = await readJson(catalogOutputPaths.categories);
  const catalogIndex = await readJson(catalogOutputPaths.index);
  const lookup = await readJson(catalogOutputPaths.lookup);
  const categoryMap = new Map(categories.map((parent) => [parent.slug, parent]));
  const seenIds = new Set();
  const seenHandles = new Set();

  assert(Array.isArray(categories) && categories.length > 0, 'categories.json is empty.');
  assert(Array.isArray(catalogIndex) && catalogIndex.length > 0, 'catalog-index.json is empty.');

  for (const item of catalogIndex) {
    assert(!seenIds.has(item.id), `Duplicate book id in catalog index: ${item.id}`);
    assert(!seenHandles.has(item.handle), `Duplicate book handle in catalog index: ${item.handle}`);
    seenIds.add(item.id);
    seenHandles.add(item.handle);

    const parent = categoryMap.get(item.parentSlug);
    assert(parent, `Unknown parent category for ${item.handle}: ${item.parentSlug}`);

    if (item.subcategorySlug) {
      assert(parent.children.some((child) => child.slug === item.subcategorySlug), `Unknown subcategory for ${item.handle}: ${item.subcategorySlug}`);
    }

    const detailPath = path.resolve(catalogOutputPaths.books, `${item.handle}.json`);
    assert(await fileExists(detailPath), `Missing detail file for ${item.handle}`);

    const detail = await readJson(detailPath);
    assert(detail.id === item.id, `Detail file id mismatch for ${item.handle}`);
    assert(detail.handle === item.handle, `Detail file handle mismatch for ${item.handle}`);

    const primaryImagePath = toLocalPath(detail.image);

    if (primaryImagePath) {
      assert(await fileExists(primaryImagePath), `Missing primary image for ${item.handle}: ${detail.image}`);
    }

    for (const imagePath of Array.isArray(detail.gallery) ? detail.gallery : []) {
      const localPath = toLocalPath(imagePath);

      if (!localPath) {
        continue;
      }

      assert(await fileExists(localPath), `Missing gallery image for ${item.handle}: ${imagePath}`);
    }
  }

  for (const item of lookup) {
    assert(seenIds.has(item.id), `lookup.json contains unknown id: ${item.id}`);
    assert(seenHandles.has(item.handle), `lookup.json contains unknown handle: ${item.handle}`);
  }

  console.log(`QA passed: ${catalogIndex.length} books, ${categories.length} parent categories.`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
