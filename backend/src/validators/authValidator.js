const { body } = require('express-validator');

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  // ✅ IMPORTANT: Allow deviceId to pass through validation
  body('deviceId')
    .optional()
    .isString().withMessage('Device ID must be a string')
];

const registerValidator = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .isLength({ min: 3, max: 20 }).withMessage('Employee ID must be 3-20 characters')
    .matches(/^[A-Za-z0-9]+$/).withMessage('Employee ID must be alphanumeric'),
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
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('role')
    .optional()
    .isIn(['admin', 'employee']).withMessage('Role must be admin or employee'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Position cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any').withMessage('Please enter a valid phone number')
];

const updatePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any').withMessage('Please enter a valid phone number'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Position cannot exceed 100 characters')
];

module.exports = {
  loginValidator,
  registerValidator,
  updatePasswordValidator,
  updateProfileValidator
};