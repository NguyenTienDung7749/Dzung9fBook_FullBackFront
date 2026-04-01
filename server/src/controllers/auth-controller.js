const { createHttpError } = require('../middleware/http-error');
const { authenticateUser, registerUser, updateUserProfile } = require('../services/user-service');

const buildSessionPayload = function (user) {
  return {
    authenticated: Boolean(user),
    user: user || null
  };
};

const getSession = async function (req, res, next) {
  try {
    res.json(buildSessionPayload(req.session?.user || null));
  } catch (error) {
    next(error);
  }
};

const login = async function (req, res, next) {
  try {
    const user = await authenticateUser(req.body);
    req.session.user = user;
    res.json(buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};

const register = async function (req, res, next) {
  try {
    const user = await registerUser(req.body);
    req.session.user = user;
    res.status(201).json(buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};

const logout = async function (req, res, next) {
  try {
    if (!req.session) {
      throw createHttpError(500, 'SESSION_UNAVAILABLE', 'Phien lam viec khong kha dung.');
    }

    delete req.session.user;
    res.json(buildSessionPayload(null));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async function (req, res, next) {
  try {
    const currentUserId = req.session?.user?.id;

    if (!currentUserId) {
      throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
    }

    const user = await updateUserProfile(currentUserId, req.body);
    req.session.user = user;
    res.json(buildSessionPayload(user));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSession,
  login,
  logout,
  register,
  updateProfile
};
