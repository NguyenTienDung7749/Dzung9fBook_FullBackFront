const { createHttpError } = require('./http-error');
const { findUserRoleContextById } = require('../services/user-service');

const normalizeRoleCode = function (value) {
  return String(value || '').trim().toLowerCase();
};

const requireRole = function (allowedRoles = []) {
  const normalizedAllowedRoles = allowedRoles
    .map(normalizeRoleCode)
    .filter(Boolean);

  return async function (req, _res, next) {
    try {
      const sessionUserId = String(req.session?.user?.id || '').trim();

      if (!sessionUserId) {
        throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
      }

      const currentUser = await findUserRoleContextById(sessionUserId);

      if (!currentUser?.id || currentUser.isActive === false) {
        throw createHttpError(401, 'AUTH_REQUIRED', 'Vui long dang nhap de tiep tuc.');
      }

      const roleCode = normalizeRoleCode(currentUser.roleCode);

      if (!roleCode || !normalizedAllowedRoles.includes(roleCode)) {
        throw createHttpError(403, 'AUTH_FORBIDDEN', 'Ban khong co quyen truy cap tai nguyen nay.');
      }

      req.currentUser = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        roleCode
      };
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireRole
};
