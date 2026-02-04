const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

/**
 * Check if user has required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};

/**
 * Admin only middleware (Legacy wrapper)
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('User not authenticated.'));
  }

  if (req.user.role !== ROLES.ADMIN) {
    return next(ApiError.forbidden('Admin access required.'));
  }

  next();
};

/**
 * Employee only middleware
 */
const employeeOnly = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('User not authenticated.'));
  }

  if (req.user.role !== ROLES.EMPLOYEE) {
    return next(ApiError.forbidden('Employee access required.'));
  }

  next();
};

const ownerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated.'));
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    const isOwner = req.user._id.toString() === resourceUserId;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return next(ApiError.forbidden('You are not authorized to access this resource.'));
    }

    next();
  };
};

module.exports = {
  authorize,
  adminOnly,
  employeeOnly,
  ownerOrAdmin
};