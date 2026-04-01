const bookAdminService = require('../services/book-admin-service');

const listBooks = async function (_req, res, next) {
  try {
    res.json({
      items: await bookAdminService.listAdminBooks()
    });
  } catch (error) {
    next(error);
  }
};

const updateInventory = async function (req, res, next) {
  try {
    res.json({
      book: await bookAdminService.updateAdminBookInventory(req.params.id, req.body)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBooks,
  updateInventory
};
