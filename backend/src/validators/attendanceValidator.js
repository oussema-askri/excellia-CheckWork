const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/helpers');

const checkInValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),
  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const checkOutValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('location')
    .optional()
    .isObject().withMessage('Location must be an object')
];

const updateAttendanceValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid attendance ID');
      }
      return true;
    }),
  body('checkIn')
    .optional()
    .isISO8601().withMessage('Check-in must be a valid date'),
  body('checkOut')
    .optional()
    .isISO8601().withMessage('Check-out must be a valid date'),
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'half-day', 'on-leave'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const listAttendanceValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
    .toInt(),
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  query('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'half-day', 'on-leave', ''])
    .withMessage('Invalid status'),
  query('userId')
    .optional()
    .custom(value => {
      if (value && !isValidObjectId(value)) {
        throw new Error('Invalid user ID');
      }
      return true;
    })
];

const attendanceIdValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid attendance ID');
      }
      return true;
    })
];

module.exports = {
  checkInValidator,
  checkOutValidator,
  updateAttendanceValidator,
  listAttendanceValidator,
  attendanceIdValidator
};