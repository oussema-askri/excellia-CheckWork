const express = require('express');
const router = express.Router();

const {
  login,
  register,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const {
  loginValidator,
  registerValidator,
  updateProfileValidator,
  updatePasswordValidator
} = require('../validators/authValidator');

// Public routes
router.post('/login', loginValidator, validate, login);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.put('/profile', updateProfileValidator, validate, updateProfile);
router.put('/password', updatePasswordValidator, validate, changePassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Admin only
router.post('/register', adminOnly, registerValidator, validate, register);

module.exports = router;