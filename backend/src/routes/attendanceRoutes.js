const express = require('express');
const router = express.Router();

const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getUserAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getAttendanceReport
} = require('../controllers/attendanceController');

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const {
  checkInValidator,
  checkOutValidator,
  updateAttendanceValidator,
  listAttendanceValidator,
  attendanceIdValidator
} = require('../validators/attendanceValidator');

// All routes require authentication
router.use(protect);

// Employee routes
router.post('/check-in', checkInValidator, validate, checkIn);
router.post('/check-out', checkOutValidator, validate, checkOut);
router.get('/today', getTodayAttendance);
router.get('/my', listAttendanceValidator, validate, getMyAttendance);

// Admin routes
router.get('/', adminOnly, listAttendanceValidator, validate, getAllAttendance);
router.get('/stats', adminOnly, getAttendanceStats);
router.get('/report', adminOnly, getAttendanceReport);
router.get('/user/:id', adminOnly, getUserAttendance);

router.route('/:id')
  .put(adminOnly, updateAttendanceValidator, validate, updateAttendance)
  .delete(adminOnly, attendanceIdValidator, validate, deleteAttendance);

module.exports = router;