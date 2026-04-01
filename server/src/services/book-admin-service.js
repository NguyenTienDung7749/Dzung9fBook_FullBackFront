const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');

const prisma = new PrismaClient();
const ADMIN_BOOK_SELECT = {
  id: true,
  handle: true,
  title: true,
  author: true,
  sku: true,
  price: true,
  isSoldOut: true,
  trackInventory: true,
  stockQuantity: true,
  allowBackorder: true,
  updatedAt: true,
  parentCategory: {
    select: {
      name: true
    }
  },
  subcategory: {
    select: {
      name: true
    }
  }
};

const serializeTimestamp = function (value) {
  return value instanceof Date
    ? value.toISOString()
    : String(value || '');
};

const normalizeBookId = function (value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const isExplicitBoolean = function (value) {
  return typeof value === 'boolean';
};

const buildSimpleInventoryState = function (isSoldOut) {
  return {
    isSoldOut: Boolean(isSoldOut),
    trackInventory: true,
    stockQuantity: isSoldOut ? 0 : 500,
    allowBackorder: false
  };
};

const serializeAdminBook = function (book) {
  return {
    id: book.id,
    handle: book.handle,
    title: book.title,
    author: book.author || '',
    sku: book.sku || '',
    price: Number(book.price || 0),
    categoryLabel: String(book.parentCategory?.name || '').trim(),
    subcategoryLabel: String(book.subcategory?.name || '').trim(),
    isSoldOut: Boolean(book.isSoldOut),
    trackInventory: Boolean(book.trackInventory),
    stockQuantity: Number.isInteger(book.stockQuantity) ? book.stockQuantity : null,
    allowBackorder: Boolean(book.allowBackorder),
    updatedAt: serializeTimestamp(book.updatedAt)
  };
};

const validateAdminInventoryPayload = function (payload = {}) {
  const isSoldOut = payload.isSoldOut;

  if (!isExplicitBoolean(isSoldOut)) {
    throw createHttpError(400, 'ADMIN_BOOK_INVALID_PAYLOAD', 'Du lieu ton kho khong hop le.');
  }

  return buildSimpleInventoryState(isSoldOut);
};

const listAdminBooks = async function () {
  const books = await prisma.book.findMany({
    orderBy: {
      title: 'asc'
    },
    select: ADMIN_BOOK_SELECT
  });

  return books.map(serializeAdminBook);
};

const updateAdminBookInventory = async function (bookId, payload = {}) {
  const normalizedBookId = normalizeBookId(bookId);

  if (!normalizedBookId) {
    throw createHttpError(404, 'BOOK_NOT_FOUND', 'Khong tim thay tua sach.');
  }

  const validatedPayload = validateAdminInventoryPayload(payload);

  try {
    const book = await prisma.book.update({
      where: {
        id: normalizedBookId
      },
      data: validatedPayload,
      select: ADMIN_BOOK_SELECT
    });

    return serializeAdminBook(book);
  } catch (error) {
    if (error?.code === 'P2025') {
      throw createHttpError(404, 'BOOK_NOT_FOUND', 'Khong tim thay tua sach.');
    }

    throw error;
  }
};

module.exports = {
  listAdminBooks,
  updateAdminBookInventory
};
