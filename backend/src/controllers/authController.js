const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const login = async (req, res, next) => {
  try {
    const { email, password, deviceId } = req.body;
    
    console.log('--- LOGIN START ---');
    console.log(`🔑 Email: ${email}`);
    console.log(`📱 Incoming Device ID: ${deviceId}`);

    // Get user
    const user = await User.findOne({ email }).select('+password +trustedDeviceId');

    if (!user) return next(ApiError.unauthorized('Invalid email or password'));
    
    // DEBUG LOG
    console.log(`💾 DB Stored Device ID: ${user.trustedDeviceId}`);

    if (!user.isActive) return next(ApiError.unauthorized('Your account has been deactivated'));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(ApiError.unauthorized('Invalid email or password'));

    if (deviceId) {
      if (!user.trustedDeviceId) {
        console.log(`📲 Binding User to Device: ${deviceId}`);
        
        // Force update using native mongo ID
        await User.collection.updateOne(
          { _id: user._id },
          { $set: { trustedDeviceId: deviceId } }
        );
        
        console.log('✅ Bind command sent to DB');
      } else if (user.trustedDeviceId !== deviceId) {
        console.log(`⛔ Blocked: Locked to ${user.trustedDeviceId} vs Incoming ${deviceId}`);
        return next(ApiError.forbidden('This account is linked to another device. Contact Admin.'));
      } else {
        console.log('✅ Device Match: Access Granted');
      }
    }

    // Still need to save lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false }); // Skip validation just in case

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const userData = user.toPublicJSON();

    console.log('--- LOGIN SUCCESS ---');
    ApiResponse.success(res, {
      user: userData,
      token,
      refreshToken
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { employeeId, name, email, password, role, department, position, phone } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return next(ApiError.conflict('Email already registered'));

    const existingEmployeeId = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (existingEmployeeId) return next(ApiError.conflict('Employee ID already exists'));

    const user = new User({
      employeeId: employeeId.toUpperCase(),
      name,
      email,
      password,
      role: role || 'employee',
      department,
      position,
      phone
    });
    await user.save();

    const userData = user.toPublicJSON();
    ApiResponse.created(res, { user: userData }, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(ApiError.notFound('User not found'));
    ApiResponse.success(res, { user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'phone', 'avatar'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) return next(ApiError.notFound('User not found'));
    ApiResponse.success(res, { user: user.toPublicJSON() }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(ApiError.notFound('User not found'));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(ApiError.badRequest('Current password is incorrect'));

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    ApiResponse.success(res, { token }, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = generateToken(req.user._id);
    const refresh = generateRefreshToken(req.user._id);
    ApiResponse.success(res, { token, refreshToken: refresh });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout
};