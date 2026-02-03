const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/helpers');

const uploadPlanningValidator = [
  // File validation is handled by multer
];

const updatePlanningValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid planning ID');
      }
      return true;
    }),
  body('shift')
    .optional()
    .trim()
    .notEmpty().withMessage('Shift cannot be empty'),
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:mm format'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const listPlanningValidator = [
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
  query('employeeId')
    .optional()
    .trim(),
  query('shift')
    .optional()
    .trim()
];

const planningIdValidator = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid planning ID');
      }
      return true;
    })
];

const batchIdValidator = [
  param('batchId')
    .trim()
    .notEmpty().withMessage('Batch ID is required')
];

module.exports = {
  uploadPlanningValidator,
  updatePlanningValidator,
  listPlanningValidator,
  planningIdValidator,
  batchIdValidator
};