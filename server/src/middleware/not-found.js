const { createHttpError } = require('./http-error');

module.exports = function notFoundMiddleware(req, _res, next) {
  next(createHttpError(404, 'NOT_FOUND', `Khong tim thay tai nguyen: ${req.originalUrl}`));
};
