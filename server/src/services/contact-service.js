const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');

const prisma = new PrismaClient();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = function (value) {
  return String(value || '').trim();
};

const normalizeOptionalText = function (value) {
  const normalized = normalizeText(value);
  return normalized || null;
};

const isValidPhone = function (value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
};

const serializeTimestamp = function (value) {
  return value instanceof Date
    ? value.toISOString()
    : String(value || '');
};

const validateContactPayload = function (payload = {}) {
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email);
  const phone = normalizeOptionalText(payload.phone);
  const message = normalizeText(payload.message);

  if (!name) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'Vui long nhap ho ten de tiep tuc.');
  }

  if (!email || !emailRegex.test(email)) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'Email lien he chua hop le.');
  }

  if (phone && !isValidPhone(phone)) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'So dien thoai can co tu 9 den 11 chu so hop le.');
  }

  if (!message) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'Vui long nhap noi dung lien he.');
  }

  if (message.length < 10 || message.length > 1000) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'Noi dung lien he can tu 10 den 1000 ky tu.');
  }

  return {
    name,
    email,
    phone,
    message
  };
};

const submitContactMessage = async function (req, payload = {}) {
  const validatedPayload = validateContactPayload(payload);
  const currentUserId = normalizeOptionalText(req.session?.user?.id);
  const contactMessage = await prisma.contactMessage.create({
    data: {
      userId: currentUserId,
      name: validatedPayload.name,
      email: validatedPayload.email,
      phone: validatedPayload.phone,
      message: validatedPayload.message
    },
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  });

  return {
    id: contactMessage.id,
    status: contactMessage.status,
    createdAt: serializeTimestamp(contactMessage.createdAt)
  };
};

module.exports = {
  submitContactMessage
};
