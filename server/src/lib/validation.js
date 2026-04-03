const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = function (value) {
  return String(value || '').trim().toLowerCase();
};

const isValidEmail = function (value) {
  return EMAIL_REGEX.test(String(value || '').trim());
};

const isValidPhone = function (value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  normalizeEmail
};
