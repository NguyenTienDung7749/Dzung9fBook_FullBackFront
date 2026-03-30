const { createHttpError } = require('../middleware/http-error');
const catalogService = require('../services/catalog-service');

const getCategories = async function (_req, res, next) {
  try {
    res.json(await catalogService.getCategories());
  } catch (error) {
    next(error);
  }
};

const listBooks = async function (req, res, next) {
  try {
    res.json(await catalogService.listBooks(req.query));
  } catch (error) {
    next(error);
  }
};

const getBookByHandle = async function (req, res, next) {
  try {
    const book = await catalogService.getBookByHandle(req.params.handle);

    if (!book) {
      throw createHttpError(404, 'BOOK_NOT_FOUND', 'Khong tim thay tua sach ban dang tim.');
    }

    res.json(book);
  } catch (error) {
    next(error);
  }
};

const resolveLegacyBookId = async function (req, res, next) {
  try {
    const id = String(req.query.id || '').trim();

    if (!id) {
      throw createHttpError(400, 'BOOK_ID_REQUIRED', 'Can truyen id sach can quy doi.');
    }

    const handle = await catalogService.resolveLegacyBookId(id);

    if (!handle) {
      throw createHttpError(404, 'BOOK_NOT_FOUND', 'Khong tim thay tua sach tu id da cho.');
    }

    res.json({ handle });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookByHandle,
  getCategories,
  listBooks,
  resolveLegacyBookId
};
