import { getCurrentUser, getUsers, saveUsers, setCurrentUser, clearCurrentUser } from '../../core/storage.js';
import { normalizeText } from '../../core/utils.js';

const createAuthError = function (code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

const buildSessionPayload = function (user) {
  return {
    authenticated: Boolean(user),
    user: user || null
  };
};

export const staticAuthProvider = {
  async getSession() {
    return buildSessionPayload(getCurrentUser());
  },

  async login(credentials) {
    const email = String(credentials?.email || '').trim();
    const password = String(credentials?.password || '').trim();
    const user = getUsers().find((item) => normalizeText(item.email) === normalizeText(email) && item.password === password);

    if (!user) {
      throw createAuthError('AUTH_INVALID_CREDENTIALS', 'Email hoac mat khau chua chinh xac.', 401);
    }

    const sessionUser = { name: user.name, email: user.email, phone: user.phone || '' };
    setCurrentUser(sessionUser);
    return buildSessionPayload(sessionUser);
  },

  async register(payload) {
    const name = String(payload?.name || '').trim();
    const email = String(payload?.email || '').trim();
    const phone = String(payload?.phone || '').trim();
    const password = String(payload?.password || '').trim();
    const users = getUsers();
    const emailExists = users.some((item) => normalizeText(item.email) === normalizeText(email));

    if (emailExists) {
      throw createAuthError('AUTH_EMAIL_EXISTS', 'Email nay da duoc su dung.', 409);
    }

    users.push({ name, email, phone, password });
    saveUsers(users);

    const sessionUser = { name, email, phone };
    setCurrentUser(sessionUser);
    return buildSessionPayload(sessionUser);
  },

  async logout() {
    clearCurrentUser();
    return buildSessionPayload(null);
  }
};
