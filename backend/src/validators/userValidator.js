const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/helpers');

const createUserValidator = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .isLength({ min: 3, max: 20 }).withMessage('Employee ID must be 3-20 characters'),
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'employee']).withMessage('Role must be admin or employee'),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim()
];

const updateUserValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid user ID');
      }
      return true;
    }),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['admin', 'employee']).withMessage('Role must be admin or employee'),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean()
];

const userIdValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid user ID');
      }
      return true;
    })
];

// ✅ FIXED: allow limit up to 1000 + safe boolean parsing
const listUsersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
    .toInt(),

  query('role')
    .optional()
    .isIn(['admin', 'employee']).withMessage('Role must be admin or employee'),

  query('isActive')
    .optional()
    .isIn(['true', 'false']).withMessage('isActive must be true or false'),

  query('search')
    .optional()
    .trim(),

  query('department')
    .optional()
    .trim(),

  query('sortBy')
    .optional()
    .trim(),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  userIdValidator,
  listUsersValidator
};