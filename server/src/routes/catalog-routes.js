const express = require('express');
const catalogController = require('../controllers/catalog-controller');

const router = express.Router();

router.get('/categories', catalogController.getCategories);
router.get('/books/resolve', catalogController.resolveLegacyBookId);
router.get('/books', catalogController.listBooks);
router.get('/books/:handle', catalogController.getBookByHandle);

module.exports = router;
