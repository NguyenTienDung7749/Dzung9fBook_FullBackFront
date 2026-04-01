const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');

const prisma = new PrismaClient();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;

const normalizeEmail = function (value) {
  return String(value || '').trim().toLowerCase();
};

const isValidPhone = function (value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
};

const createInactiveAccountError = function () {
  return createHttpError(401, 'AUTH_ACCOUNT_INACTIVE', 'Tai khoan hien khong con hoat dong.');
};

const sanitizeUser = function (user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    createdAt: user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : String(user.createdAt || '')
  };
};

const findUserRecordByEmail = async function (email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive'
      }
    }
  });
};

const findUserById = async function (userId) {
  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: normalizedUserId
    }
  });

  return sanitizeUser(user);
};

const findUserRoleContextById = async function (userId) {
  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: normalizedUserId
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: {
        select: {
          code: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: Boolean(user.isActive),
    roleCode: String(user.role?.code || '').trim()
  };
};

const getCustomerRoleId = async function () {
  const role = await prisma.role.findUnique({
    where: {
      code: 'customer'
    }
  });

  if (!role) {
    throw createHttpError(500, 'AUTH_ROLE_MISSING', 'Khong tim thay role mac dinh cho nguoi dung.');
  }

  return role.id;
};

const validateProfilePayload = function (payload = {}) {
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();

  if (!name) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin ho so chua hop le.');
  }

  if (phone && !isValidPhone(phone)) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'So dien thoai can co tu 9 den 11 chu so hop le.');
  }

  return {
    name,
    phone: phone || null
  };
};

const validateRegisterPayload = function (payload = {}) {
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(payload.email);
  const phone = String(payload.phone || '').trim();
  const password = String(payload.password || '').trim();

  if (!name || !email || !password) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin dang ky chua day du.');
  }

  if (!emailRegex.test(email)) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Email chua dung dinh dang hop le.');
  }

  if (phone && !isValidPhone(phone)) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'So dien thoai can co tu 9 den 11 chu so hop le.');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', `Mat khau can co it nhat ${PASSWORD_MIN_LENGTH} ky tu.`);
  }

  return {
    name,
    email,
    phone: phone || null,
    password
  };
};

const registerUser = async function (payload = {}) {
  const validatedPayload = validateRegisterPayload(payload);

  const existingUser = await findUserRecordByEmail(validatedPayload.email);

  if (existingUser) {
    throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'Email nay da duoc su dung.');
  }

  const nextUser = await prisma.user.create({
    data: {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
      roleId: await getCustomerRoleId(),
      name: validatedPayload.name,
      email: validatedPayload.email,
      phone: validatedPayload.phone,
      passwordHash: await bcrypt.hash(validatedPayload.password, 10),
      isActive: true,
      createdAt: new Date()
    }
  });

  return sanitizeUser(nextUser);
};

const updateUserProfile = async function (userId, payload = {}) {
  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
  }

  const validatedPayload = validateProfilePayload(payload);

  try {
    const user = await prisma.user.update({
      where: {
        id: normalizedUserId
      },
      data: validatedPayload
    });

    return sanitizeUser(user);
  } catch (error) {
    if (error?.code === 'P2025') {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'Khong tim thay tai khoan.');
    }

    throw error;
  }
};

const authenticateUser = async function (payload = {}) {
  const email = String(payload.email || '').trim();
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin dang nhap chua day du.');
  }

  const user = await findUserRecordByEmail(email);

  if (!user) {
    throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Email hoac mat khau chua chinh xac.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Email hoac mat khau chua chinh xac.');
  }

  if (user.isActive === false) {
    throw createInactiveAccountError();
  }

  return sanitizeUser(user);
};

module.exports = {
  authenticateUser,
  findUserById,
  findUserRoleContextById,
  registerUser,
  updateUserProfile
};
