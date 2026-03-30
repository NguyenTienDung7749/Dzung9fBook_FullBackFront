const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { createHttpError } = require('../middleware/http-error');

const USERS_FILE = path.resolve(process.cwd(), 'server', 'data', 'users.json');
let writeQueue = Promise.resolve();

const normalizeEmail = function (value) {
  return String(value || '').trim().toLowerCase();
};

const ensureUsersFile = async function () {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await fs.writeFile(USERS_FILE, '[]\n', 'utf8');
  }
};

const readUsers = async function () {
  await ensureUsersFile();

  try {
    const rawValue = await fs.readFile(USERS_FILE, 'utf8');
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createHttpError(500, 'USERS_FILE_INVALID', 'Du lieu nguoi dung khong hop le.');
    }

    throw error;
  }
};

const writeUsers = async function (users) {
  writeQueue = writeQueue.then(async function () {
    await ensureUsersFile();
    await fs.writeFile(USERS_FILE, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
  });

  await writeQueue;
};

const sanitizeUser = function (user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    createdAt: user.createdAt
  };
};

const registerUser = async function (payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const password = String(payload.password || '').trim();

  if (!name || !email || !password) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin dang ky chua day du.');
  }

  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  const emailExists = users.some((user) => normalizeEmail(user.email) === normalizedEmail);

  if (emailExists) {
    throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'Email nay da duoc su dung.');
  }

  const nextUser = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`,
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  };

  users.push(nextUser);
  await writeUsers(users);
  return sanitizeUser(nextUser);
};

const authenticateUser = async function (payload = {}) {
  const email = String(payload.email || '').trim();
  const password = String(payload.password || '').trim();

  if (!email || !password) {
    throw createHttpError(400, 'AUTH_INVALID_PAYLOAD', 'Thong tin dang nhap chua day du.');
  }

  const users = await readUsers();
  const user = users.find((item) => normalizeEmail(item.email) === normalizeEmail(email));

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
  registerUser
};
