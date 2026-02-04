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
const { adminOnly, authorize } = require('../middleware/roleCheck'); // ✅ Import authorize
const validate = require('../middleware/validate');
const {
  checkInValidator,
  checkOutValidator,
  updateAttendanceValidator,
  listAttendanceValidator,
  attendanceIdValidator
} = require('../validators/attendanceValidator');

router.use(protect);

// Employee routes
router.post('/check-in', checkInValidator, validate, checkIn);
router.post('/check-out', checkOutValidator, validate, checkOut);
router.get('/today', getTodayAttendance);
router.get('/my', listAttendanceValidator, validate, getMyAttendance);

// ✅ Allow Zitouna + Admin to view attendance
router.get('/', authorize('admin', 'zitouna'), listAttendanceValidator, validate, getAllAttendance);
router.get('/stats', authorize('admin', 'zitouna'), getAttendanceStats);
router.get('/report', authorize('admin', 'zitouna'), getAttendanceReport);
router.get('/user/:id', authorize('admin', 'zitouna'), getUserAttendance);

// 🔒 Writes are Admin Only
router.route('/:id')
  .put(adminOnly, updateAttendanceValidator, validate, updateAttendance)
  .delete(adminOnly, attendanceIdValidator, validate, deleteAttendance);

module.exports = router;