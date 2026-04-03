const normalizeText = function (value) {
  return String(value || '').trim();
};

const normalizeOptionalText = function (value) {
  const normalizedValue = normalizeText(value);
  return normalizedValue || null;
};

const normalizeEnumValue = function (value) {
  return normalizeText(value).toUpperCase();
};

const serializeTimestamp = function (value) {
  return value instanceof Date
    ? value.toISOString()
    : String(value || '');
};

const normalizeBooleanEnv = function (value) {
  return ['1', 'true', 'yes', 'on'].includes(normalizeText(value).toLowerCase());
};

module.exports = {
  normalizeBooleanEnv,
  normalizeEnumValue,
  normalizeOptionalText,
  normalizeText,
  serializeTimestamp
};
