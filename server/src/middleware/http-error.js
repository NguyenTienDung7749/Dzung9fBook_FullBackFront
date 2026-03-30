const createHttpError = function (status, code, message, details = null) {
  const error = new Error(message);
  error.status = Number(status) || 500;
  error.code = String(code || 'INTERNAL_ERROR');
  error.details = details;
  return error;
};

module.exports = {
  createHttpError
};
