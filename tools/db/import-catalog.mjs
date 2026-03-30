import {
  createPrismaClient,
  isDirectRun,
  readBookDetails,
  readCategoriesJson,
  toOptionalString,
  toPathKey
} from './shared.mjs';

const buildCategoryRows = function (categories) {
  const rows = [];

  (Array.isArray(categories) ? categories : []).forEach((parent, parentIndex) => {
    const parentPath = toPathKey(parent.slug);

    rows.push({
      path: parentPath,
      parentPath: null,
      slug: String(parent.slug || '').trim(),
      name: String(parent.label || '').trim(),
      description: toOptionalString(parent.description),
      depth: 0,
      sortOrder: Number.isFinite(parent.order) ? parent.order : parentIndex + 1,
      featured: Boolean(parent.featured)
    });

    (Array.isArray(parent.children) ? parent.children : []).forEach((child, childIndex) => {
      rows.push({
        path: toPathKey(parent.slug, child.slug),
        parentPath,
        slug: String(child.slug || '').trim(),
        name: String(child.label || '').trim(),
        description: null,
        depth: 1,
        sortOrder: Number.isFinite(child.order) ? child.order : childIndex + 1,
        featured: Boolean(child.featured)
      });
    });
  });

  return rows;
};

export const importCatalog = async function (prisma) {
  const [categories, books] = await Promise.all([
    readCategoriesJson(),
    readBookDetails()
  ]);
  const categoryRows = buildCategoryRows(categories);
  const categoryIdByPath = new Map();

  for (const categoryRow of categoryRows.filter((row) => row.depth === 0)) {
    const category = await prisma.category.upsert({
      where: { path: categoryRow.path },
      update: {
        slug: categoryRow.slug,
        name: categoryRow.name,
        description: categoryRow.description,
        depth: categoryRow.depth,
        sortOrder: categoryRow.sortOrder,
        featured: categoryRow.featured,
        isActive: true
      },
      create: {
        slug: categoryRow.slug,
        path: categoryRow.path,
        name: categoryRow.name,
        description: categoryRow.description,
        depth: categoryRow.depth,
        sortOrder: categoryRow.sortOrder,
        featured: categoryRow.featured,
        isActive: true
      }
    });

    categoryIdByPath.set(categoryRow.path, category.id);
  }

  for (const categoryRow of categoryRows.filter((row) => row.depth === 1)) {
    const parentId = categoryIdByPath.get(categoryRow.parentPath);

    if (!parentId) {
      throw new Error(`Missing parent category for ${categoryRow.path}`);
    }

    const category = await prisma.category.upsert({
      where: { path: categoryRow.path },
      update: {
        parentId,
        slug: categoryRow.slug,
        name: categoryRow.name,
        description: categoryRow.description,
        depth: categoryRow.depth,
        sortOrder: categoryRow.sortOrder,
        featured: categoryRow.featured,
        isActive: true
      },
      create: {
        parentId,
        slug: categoryRow.slug,
        path: categoryRow.path,
        name: categoryRow.name,
        description: categoryRow.description,
        depth: categoryRow.depth,
        sortOrder: categoryRow.sortOrder,
        featured: categoryRow.featured,
        isActive: true
      }
    });

    categoryIdByPath.set(categoryRow.path, category.id);
  }

  const parentCounts = new Map();
  const childCounts = new Map();

  for (const book of books) {
    const parentPath = toPathKey(book.parentSlug);
    const parentCategoryId = categoryIdByPath.get(parentPath);

    if (!parentCategoryId) {
      throw new Error(`Missing parent category for book ${book.handle || book.id}: ${parentPath}`);
    }

    let subcategoryId = null;

    if (String(book.subcategorySlug || '').trim()) {
      const subcategoryPath = toPathKey(book.parentSlug, book.subcategorySlug);
      subcategoryId = categoryIdByPath.get(subcategoryPath) || null;

      if (!subcategoryId) {
        throw new Error(`Missing subcategory for book ${book.handle || book.id}: ${subcategoryPath}`);
      }

      childCounts.set(subcategoryId, (childCounts.get(subcategoryId) || 0) + 1);
    }

    parentCounts.set(parentCategoryId, (parentCounts.get(parentCategoryId) || 0) + 1);

    await prisma.book.upsert({
      where: { id: Number(book.id) },
      update: {
        handle: String(book.handle || '').trim(),
        title: String(book.title || '').trim(),
        author: toOptionalString(book.author),
        publisher: toOptionalString(book.publisher),
        year: toOptionalString(book.year),
        sku: toOptionalString(book.sku),
        bookType: toOptionalString(book.bookType),
        language: toOptionalString(book.language),
        pages: toOptionalString(book.pages),
        weight: toOptionalString(book.weight),
        size: toOptionalString(book.size),
        price: Number(book.price || 0),
        compareAtPrice: Number(book.compareAtPrice || 0),
        discountLabel: toOptionalString(book.discountLabel),
        isSoldOut: Boolean(book.isSoldOut),
        listingStyle: toOptionalString(book.listingStyle),
        image: String(book.image || '').trim(),
        gallery: Array.isArray(book.gallery) ? book.gallery : [],
        description: toOptionalString(book.description),
        descriptionHtml: toOptionalString(book.descriptionHtml),
        descriptionText: toOptionalString(book.descriptionText),
        specs: Array.isArray(book.specs) ? book.specs : [],
        sourceUrl: toOptionalString(book.sourceUrl),
        parentCategoryId,
        subcategoryId,
        trackInventory: false,
        stockQuantity: null,
        allowBackorder: false,
        isActive: true
      },
      create: {
        id: Number(book.id),
        handle: String(book.handle || '').trim(),
        title: String(book.title || '').trim(),
        author: toOptionalString(book.author),
        publisher: toOptionalString(book.publisher),
        year: toOptionalString(book.year),
        sku: toOptionalString(book.sku),
        bookType: toOptionalString(book.bookType),
        language: toOptionalString(book.language),
        pages: toOptionalString(book.pages),
        weight: toOptionalString(book.weight),
        size: toOptionalString(book.size),
        price: Number(book.price || 0),
        compareAtPrice: Number(book.compareAtPrice || 0),
        discountLabel: toOptionalString(book.discountLabel),
        isSoldOut: Boolean(book.isSoldOut),
        listingStyle: toOptionalString(book.listingStyle),
        image: String(book.image || '').trim(),
        gallery: Array.isArray(book.gallery) ? book.gallery : [],
        description: toOptionalString(book.description),
        descriptionHtml: toOptionalString(book.descriptionHtml),
        descriptionText: toOptionalString(book.descriptionText),
        specs: Array.isArray(book.specs) ? book.specs : [],
        sourceUrl: toOptionalString(book.sourceUrl),
        parentCategoryId,
        subcategoryId,
        trackInventory: false,
        stockQuantity: null,
        allowBackorder: false,
        isActive: true
      }
    });
  }

  await prisma.category.updateMany({
    data: {
      bookCount: 0
    }
  });

  for (const [categoryId, bookCount] of parentCounts.entries()) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { bookCount }
    });
  }

  for (const [categoryId, bookCount] of childCounts.entries()) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { bookCount }
    });
  }

  return {
    categoryCount: categoryRows.length,
    bookCount: books.length
  };
};

const main = async function () {
  const prisma = createPrismaClient();

  try {
    const result = await importCatalog(prisma);
    console.log(`Imported ${result.categoryCount} categories and ${result.bookCount} books.`);
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (isDirectRun(import.meta.url)) {
  await main();
}
