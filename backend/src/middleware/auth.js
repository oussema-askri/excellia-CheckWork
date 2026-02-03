const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const jwtConfig = require('../config/jwt');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(ApiError.unauthorized('Access denied. No token provided.'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(ApiError.unauthorized('User not found.'));
      }

      // Check if user is active
      if (!user.isActive) {
        return next(ApiError.unauthorized('Your account has been deactivated.'));
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Token has expired.'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(ApiError.unauthorized('Invalid token.'));
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn, algorithm: jwtConfig.algorithm }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    jwtConfig.secret,
    { expiresIn: jwtConfig.refreshExpiresIn, algorithm: jwtConfig.algorithm }
  );
};

module.exports = {
  protect,
  generateToken,
  generateRefreshToken
};