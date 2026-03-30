module.exports = function errorHandler(error, _req, res, _next) {
  const status = Number(error?.status) || 500;
  const code = String(error?.code || 'INTERNAL_ERROR');
  const message = status >= 500
    ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
    : String(error?.message || 'Yêu cầu không hợp lệ.');

  const payload = {
    code,
    message
  };

  if (error?.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500 && error?.stack) {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
};
