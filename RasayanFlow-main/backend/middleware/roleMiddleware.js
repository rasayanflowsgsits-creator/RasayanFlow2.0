const asyncHandler = require('express-async-handler');

const normalizeRole = (r) => (r ? String(r).toLowerCase().replace(/[-_]/g, '') : '');

const roleMiddleware = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('No user attached to request');
    }

    const userRoleNorm = normalizeRole(req.user.role);
    const allowedNorm = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map(normalizeRole);

    if (!allowedNorm.includes(userRoleNorm)) {
      res.status(403);
      throw new Error(`Forbidden: insufficient permission (role: ${req.user.role})`);
    }

    next();
  });
};

module.exports = roleMiddleware;
