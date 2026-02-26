const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../utils/helpers');

const checkInValidator = [
  body('notes').optional().trim().isLength({ max: 500 }),
  body('location').optional().isObject(),
];

const checkOutValidator = [
  body('notes').optional().trim().isLength({ max: 500 }),
  body('location').optional().isObject()
];

const updateAttendanceValidator = [
  param('id').custom(value => isValidObjectId(value) ? true : Promise.reject('Invalid ID')),
  body('status').optional().isIn(['present', 'absent', 'late', 'half-day', 'on-leave', 'pending-absence'])
];

const listAttendanceValidator = [
  query('page').optional().toInt(),
  query('limit').optional().toInt(),
  // ✅ FIX: Allow empty status string
  query('status').optional().custom(val => {
    if (val === '') return true; // Allow empty
    const allowed = ['present', 'absent', 'late', 'half-day', 'on-leave', 'pending-absence'];
    if (!allowed.includes(val)) throw new Error('Invalid status');
    return true;
  })
];

const attendanceIdValidator = [
  param('id').custom(value => isValidObjectId(value) ? true : Promise.reject('Invalid ID'))
];

module.exports = {
  checkInValidator,
  checkOutValidator,
  updateAttendanceValidator,
  listAttendanceValidator,
  attendanceIdValidator
};