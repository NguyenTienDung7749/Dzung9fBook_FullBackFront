const { createHttpError } = require('./http-error');
const { findUserRoleContextById } = require('../services/user-service');

const clearSessionUser = function (req) {
  if (req.session && Object.prototype.hasOwnProperty.call(req.session, 'user')) {
    delete req.session.user;
  }
};

const requireActiveUser = async function (req, _res, next) {
  try {
    const sessionUserId = String(req.session?.user?.id || '').trim();

    if (!sessionUserId) {
      throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
    }

    const currentUser = await findUserRoleContextById(sessionUserId);

    if (!currentUser?.id) {
      clearSessionUser(req);
      throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
    }

    if (currentUser.isActive === false) {
      clearSessionUser(req);
      throw createHttpError(401, 'AUTH_ACCOUNT_INACTIVE', 'Tai khoan hien khong con hoat dong.');
    }

    req.currentUser = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      roleCode: String(currentUser.roleCode || '').trim()
    };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireActiveUser
};
