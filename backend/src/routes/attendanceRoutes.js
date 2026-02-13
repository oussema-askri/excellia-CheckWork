const express = require('express');
const router = express.Router();

const {
  checkIn,
  checkOut,
  markAbsent,
  approveAbsence,
  rejectAbsence,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getUserAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getAttendanceReport,
  getWassalniStats // ✅ NEW
} = require('../controllers/attendanceController');

const { protect } = require('../middleware/auth');
const { adminOnly, authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const {
  checkInValidator,
  checkOutValidator,
  updateAttendanceValidator,
  listAttendanceValidator,
  attendanceIdValidator
} = require('../validators/attendanceValidator');

router.use(protect);

router.post('/check-in', checkInValidator, validate, checkIn);
router.post('/check-out', checkOutValidator, validate, checkOut);
router.post('/absent', markAbsent);
router.get('/today', getTodayAttendance);
router.get('/my', listAttendanceValidator, validate, getMyAttendance);

// ✅ Wassalni Stats (Admin/Zitouna)
router.get('/wassalni', authorize('admin', 'zitouna'), getWassalniStats);

router.get('/', authorize('admin', 'zitouna'), listAttendanceValidator, validate, getAllAttendance);
router.get('/stats', authorize('admin', 'zitouna'), getAttendanceStats);
router.get('/report', authorize('admin', 'zitouna'), getAttendanceReport);
router.get('/user/:id', authorize('admin', 'zitouna'), getUserAttendance);

router.put('/:id/approve', adminOnly, approveAbsence);
router.put('/:id/reject', adminOnly, rejectAbsence);

router.route('/:id')
  .put(adminOnly, updateAttendanceValidator, validate, updateAttendance)
  .delete(adminOnly, attendanceIdValidator, validate, deleteAttendance);

module.exports = router;