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
  resetDevice // ✅ Imported
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
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

router.use(adminOnly);

router.route('/')
  .get(listUsersValidator, validate, getUsers)
  .post(createUserValidator, validate, createUser);

router.get('/stats', getUserStats);

// ✅ NEW Route
router.put('/:id/reset-device', userIdValidator, validate, resetDevice);

router.route('/:id')
  .get(userIdValidator, validate, getUser)
  .put(updateUserValidator, validate, updateUser)
  .delete(userIdValidator, validate, deleteUser);

router.put('/:id/status', userIdValidator, validate, toggleUserStatus);

module.exports = router;