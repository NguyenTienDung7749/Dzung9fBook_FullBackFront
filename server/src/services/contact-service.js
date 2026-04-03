const prisma = require('../lib/prisma');
const {
  normalizeEnumValue,
  normalizeOptionalText,
  normalizeText,
  serializeTimestamp
} = require('../lib/normalize');
const { isValidEmail, isValidPhone } = require('../lib/validation');
const { createHttpError } = require('../middleware/http-error');
const CONTACT_STATUS_VALUES = new Set(['RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

const validateContactPayload = function (payload = {}) {
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email);
  const phone = normalizeOptionalText(payload.phone);
  const message = normalizeText(payload.message);

  if (!name) {
    throw createHttpError(400, 'CONTACT_INVALID_PAYLOAD', 'Vui long nhap ho ten de tiep tuc.');
  }

  if (!email || !isValidEmail(email)) {
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

const validateMessageStatusFilter = function (value) {
  const normalizedStatus = normalizeEnumValue(value);

  if (!normalizedStatus) {
    return null;
  }

  if (!CONTACT_STATUS_VALUES.has(normalizedStatus)) {
    throw createHttpError(400, 'ADMIN_MESSAGE_INVALID_FILTER', 'Bo loc trang thai lien he khong hop le.');
  }

  return normalizedStatus;
};

const validateAdminMessageStatusPayload = function (payload = {}) {
  const status = normalizeEnumValue(payload.status);
  const adminNoteProvided = payload.adminNote !== undefined;
  const adminNote = adminNoteProvided ? normalizeOptionalText(payload.adminNote) : undefined;

  if (!status || !CONTACT_STATUS_VALUES.has(status)) {
    throw createHttpError(400, 'ADMIN_MESSAGE_INVALID_PAYLOAD', 'Trang thai lien he khong hop le.');
  }

  return {
    status,
    ...(adminNoteProvided ? { adminNote } : {})
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

const listAdminMessages = async function (query = {}) {
  const status = validateMessageStatusFilter(query.status);
  const messages = await prisma.contactMessage.findMany({
    where: status ? { status } : undefined,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      phone: true,
      message: true,
      status: true,
      adminNote: true,
      handledBy: true,
      createdAt: true
    }
  });

  return messages.map(function (message) {
    return {
      id: message.id,
      name: message.name,
      email: message.email,
      phone: message.phone || null,
      message: message.message,
      status: message.status,
      adminNote: message.adminNote || null,
      createdAt: serializeTimestamp(message.createdAt),
      userId: message.userId || null,
      handledById: message.handledBy || null
    };
  });
};

const updateAdminMessageStatus = async function (messageId, currentUserId, payload = {}) {
  const normalizedMessageId = normalizeOptionalText(messageId);
  const normalizedCurrentUserId = normalizeOptionalText(currentUserId);

  if (!normalizedMessageId) {
    throw createHttpError(404, 'MESSAGE_NOT_FOUND', 'Khong tim thay lien he.');
  }

  if (!normalizedCurrentUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  const validatedPayload = validateAdminMessageStatusPayload(payload);

  try {
    const message = await prisma.contactMessage.update({
      where: {
        id: normalizedMessageId
      },
      data: {
        status: validatedPayload.status,
        handledBy: normalizedCurrentUserId,
        ...(validatedPayload.adminNote !== undefined ? { adminNote: validatedPayload.adminNote } : {})
      },
      select: {
        id: true,
        status: true,
        adminNote: true,
        handledBy: true,
        updatedAt: true
      }
    });

    return {
      id: message.id,
      status: message.status,
      adminNote: message.adminNote || null,
      handledById: message.handledBy || null,
      updatedAt: serializeTimestamp(message.updatedAt)
    };
  } catch (error) {
    if (error?.code === 'P2025') {
      throw createHttpError(404, 'MESSAGE_NOT_FOUND', 'Khong tim thay lien he.');
    }

    throw error;
  }
};

module.exports = {
  listAdminMessages,
  submitContactMessage,
  updateAdminMessageStatus
};
