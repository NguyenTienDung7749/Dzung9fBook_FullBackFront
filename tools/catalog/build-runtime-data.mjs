import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { catalogOutputPaths, catalogSourceFiles } from './config/collections.mjs';

const slugifyText = function (value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeText = function (value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
};

const normalizeAssetPath = function (value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.replace(/\\/g, '/');

  if (/^(?:https?:)?\/\//i.test(normalizedValue) || normalizedValue.startsWith('data:')) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith('./')) {
    return normalizedValue;
  }

  return `./${normalizedValue.replace(/^\/+/, '')}`;
};

const readVariableFromJsFile = async function (filePath, variableName) {
  const source = await fs.readFile(filePath, 'utf8');
  const context = {};
  vm.runInNewContext(`${source}\n;globalThis.__catalog_value = ${variableName};`, context, { filename: filePath });
  return JSON.parse(JSON.stringify(context.__catalog_value));
};

const sortNodesByOrder = function (nodes) {
  return [...nodes]
    .map((node, index) => ({ node, index }))
    .sort((first, second) => {
      const firstOrder = Number.isFinite(first.node.order) ? first.node.order : Number.POSITIVE_INFINITY;
      const secondOrder = Number.isFinite(second.node.order) ? second.node.order : Number.POSITIVE_INFINITY;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.index - second.index;
    })
    .map((entry) => entry.node);
};

const normalizeCategories = function (categories) {
  return sortNodesByOrder(Array.isArray(categories) ? categories : []).map((parent) => ({
    label: parent.label,
    slug: parent.slug || slugifyText(parent.label),
    order: Number.isFinite(parent.order) ? parent.order : null,
    featured: Boolean(parent.featured),
    description: String(parent.description || '').trim(),
    children: sortNodesByOrder(Array.isArray(parent.children) ? parent.children : []).map((child) => ({
      label: child.label,
      slug: child.slug || slugifyText(child.label),
      order: Number.isFinite(child.order) ? child.order : null,
      featured: Boolean(child.featured),
      bookCount: 0
    }))
  }));
};

const buildFieldSpecs = function (book) {
  return [
    { label: 'Mã hàng', value: book.sku },
    { label: 'Tác giả', value: book.author },
    { label: 'Nhà phát hành', value: book.publisher },
    { label: 'Năm XB', value: book.year },
    { label: 'Ngôn ngữ', value: book.language },
    { label: 'Số trang', value: book.pages },
    { label: 'Kích thước', value: book.size },
    { label: 'Khối lượng', value: book.weight },
    { label: 'Hình thức', value: book.bookType }
  ].filter((item) => String(item.value || '').trim());
};

const dedupeSpecs = function (specs) {
  const seen = new Set();
  const items = [];

  specs.forEach((spec) => {
    const label = String(spec?.label || '').trim();
    const value = String(spec?.value || '').trim();
    const key = `${normalizeText(label)}::${normalizeText(value)}`;

    if (!label || !value || seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push({ label, value });
  });

  return items;
};

const extractDescriptionText = function (book) {
  const description = String(book.description || '').trim();

  if (description) {
    return description;
  }

  return String(book.descriptionHtml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const pickPrimaryImage = function (book) {
  if (String(book.image || '').trim()) {
    return normalizeAssetPath(book.image);
  }

  const gallery = Array.isArray(book.gallery) ? book.gallery.map(normalizeAssetPath).filter(Boolean) : [];
  return gallery[0] || './assets/images/feature-1.png';
};

const normalizeBooks = function (books, categories) {
  const parentByLabel = new Map(categories.map((parent) => [normalizeText(parent.label), parent]));

  return books.map((book) => {
    const parent = parentByLabel.get(normalizeText(book.category)) || null;
    const parentSlug = parent ? parent.slug : slugifyText(book.category);
    const subcategorySlug = typeof book.subcategory === 'string' ? book.subcategory.trim() : '';
    const subcategory = parent && subcategorySlug
      ? parent.children.find((child) => child.slug === subcategorySlug) || null
      : null;
    const gallery = [...new Set((Array.isArray(book.gallery) ? book.gallery : []).map(normalizeAssetPath).filter(Boolean))];
    const primaryImage = pickPrimaryImage(book);
    const descriptionText = extractDescriptionText(book);

    return {
      ...book,
      handle: String(book.handle || slugifyText(book.title)),
      categoryLabel: parent ? parent.label : String(book.category || '').trim(),
      parentSlug,
      subcategorySlug,
      subcategoryLabel: subcategory ? subcategory.label : '',
      image: primaryImage,
      gallery: gallery.length ? gallery : [primaryImage],
      specs: dedupeSpecs([...(Array.isArray(book.specs) ? book.specs : []), ...buildFieldSpecs(book)]),
      descriptionText
    };
  });
};

const buildCatalogIndex = function (books) {
  return books.map((book) => ({
    id: book.id,
    handle: book.handle,
    title: book.title,
    author: book.author,
    categoryLabel: book.categoryLabel,
    parentSlug: book.parentSlug,
    subcategorySlug: book.subcategorySlug,
    subcategoryLabel: book.subcategoryLabel,
    listingStyle: book.listingStyle || 'default',
    price: book.price,
    compareAtPrice: book.compareAtPrice || 0,
    discountLabel: book.discountLabel || '',
    isSoldOut: Boolean(book.isSoldOut),
    image: book.image,
    description: book.descriptionText.length > 220 ? `${book.descriptionText.slice(0, 217).trimEnd()}...` : book.descriptionText
  }));
};

const attachCategoryCounts = function (categories, books) {
  const nextCategories = categories.map((parent) => ({
    ...parent,
    bookCount: 0,
    children: parent.children.map((child) => ({ ...child, bookCount: 0 }))
  }));
  const categoryMap = new Map(nextCategories.map((parent) => [parent.slug, parent]));

  books.forEach((book) => {
    const parent = categoryMap.get(book.parentSlug);

    if (!parent) {
      return;
    }

    parent.bookCount += 1;

    if (!book.subcategorySlug) {
      return;
    }

    const child = parent.children.find((entry) => entry.slug === book.subcategorySlug);

    if (child) {
      child.bookCount += 1;
    }
  });

  return nextCategories;
};

const buildLookup = function (books) {
  return books.map((book) => ({
    id: book.id,
    handle: book.handle
  }));
};

const writeJson = async function (filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const cleanDirectory = async function (directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
  await fs.mkdir(directoryPath, { recursive: true });
};

const main = async function () {
  const rawBooks = await readVariableFromJsFile(catalogSourceFiles.books, 'books');
  const rawCategories = await readVariableFromJsFile(catalogSourceFiles.categories, 'categoryTree');
  const categories = normalizeCategories(rawCategories);
  const books = normalizeBooks(rawBooks, categories);
  const categoriesWithCounts = attachCategoryCounts(categories, books);
  const catalogIndex = buildCatalogIndex(books);
  const lookup = buildLookup(books);

  await cleanDirectory(catalogOutputPaths.books);
  await fs.rm(path.resolve(catalogOutputPaths.root, 'home-featured.json'), { force: true });
  await writeJson(catalogOutputPaths.categories, categoriesWithCounts);
  await writeJson(catalogOutputPaths.index, catalogIndex);
  await writeJson(catalogOutputPaths.lookup, lookup);

  await Promise.all(books.map((book) => {
    const detailPath = path.resolve(catalogOutputPaths.books, `${book.handle}.json`);
    return writeJson(detailPath, book);
  }));

  console.log(`Built ${books.length} book detail files.`);
  console.log(`Wrote categories to ${catalogOutputPaths.categories}.`);
  console.log(`Wrote catalog index to ${catalogOutputPaths.index}.`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
