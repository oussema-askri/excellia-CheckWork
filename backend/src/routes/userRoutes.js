const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  resetDevice
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');
const { adminOnly, authorize } = require('../middleware/roleCheck'); // ✅ Import authorize
const validate = require('../middleware/validate');
const {
  createUserValidator,
  updateUserValidator,
  userIdValidator,
  listUsersValidator
} = require('../validators/userValidator');

const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');

router.use(protect);

router.get('/departments', async (req, res, next) => {
  try {
    const departments = await User.distinct('department', { 
      department: { $ne: '', $exists: true, $ne: null },
      isActive: true
    });
    const filteredDepts = departments.filter(d => d && d.trim() !== '');
    ApiResponse.success(res, { departments: filteredDepts });
  } catch (error) {
    next(error);
  }
});

// ✅ Allow Zitouna + Admin to view users
router.get('/', authorize('admin', 'zitouna'), listUsersValidator, validate, getUsers);
router.get('/stats', authorize('admin', 'zitouna'), getUserStats);
router.get('/:id', authorize('admin', 'zitouna'), userIdValidator, validate, getUser);

// 🔒 Writes are Admin Only
router.post('/', adminOnly, createUserValidator, validate, createUser);
router.put('/:id/reset-device', adminOnly, userIdValidator, validate, resetDevice);
router.put('/:id', adminOnly, updateUserValidator, validate, updateUser);
router.delete('/:id', adminOnly, userIdValidator, validate, deleteUser);
router.put('/:id/status', adminOnly, userIdValidator, validate, toggleUserStatus);

module.exports = router;