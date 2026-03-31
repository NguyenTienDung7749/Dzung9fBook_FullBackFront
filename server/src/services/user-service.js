const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('../middleware/http-error');

const prisma = new PrismaClient();

const normalizeEmail = function (value) {
  return String(value || '').trim().toLowerCase();
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

const registerUser = async function (payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const password = String(payload.password || '').trim();

  if (!name || !email || !password) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin dang ky chua day du.');
  }

  const existingUser = await findUserRecordByEmail(email);

  if (existingUser) {
    throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'Email nay da duoc su dung.');
  }

  const nextUser = await prisma.user.create({
    data: {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
      roleId: await getCustomerRoleId(),
      name,
      email,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 10),
      isActive: true,
      createdAt: new Date()
    }
  });

  return sanitizeUser(nextUser);
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

  return sanitizeUser(user);
};

module.exports = {
  authenticateUser,
  findUserById,
  findUserRoleContextById,
  registerUser
};
