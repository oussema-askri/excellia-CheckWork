const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Planning = require('../models/Planning');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');
const mongoose = require('mongoose'); // ✅ Import mongoose here

const getUsers = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      role,
      isActive,
      search,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (department) query.department = { $regex: department, $options: 'i' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // ✅ Include trustedDeviceId (hidden field) to show status
    const [users, total] = await Promise.all([
      User.find(query)
        .select('+trustedDeviceId -password') 
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    // Map to include a boolean flag instead of the raw ID
    const data = users.map(u => ({
      ...u.toPublicJSON(),
      hasLinkedDevice: !!u.trustedDeviceId
    }));

    ApiResponse.paginated(res, data, pagination);
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return next(ApiError.notFound('User not found'));
    ApiResponse.success(res, { user });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { employeeId, name, email, password, role, department, position, phone } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { employeeId: employeeId.toUpperCase() }
      ]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Employee ID';
      return next(ApiError.conflict(`${field} already exists`));
    }

    const user = new User({
      employeeId: employeeId.toUpperCase(),
      name,
      email: email.toLowerCase(),
      password, 
      role: role || 'employee',
      department: department || '',
      position: position || '',
      phone: phone || ''
    });

    await user.save();

    await Planning.updateMany(
      { employeeId: user.employeeId, userId: null },
      { $set: { userId: user._id } }
    );

    ApiResponse.created(res, { user: user.toPublicJSON() }, 'User created successfully');
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, department, position, phone, isActive, password } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) return next(ApiError.notFound('User not found'));

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUser) return next(ApiError.conflict('Email already in use'));
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    
    if (password && password.trim() !== '') {
      user.password = password;
    }

    await user.save();
    ApiResponse.success(res, { user: user.toPublicJSON() }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(ApiError.notFound('User not found'));
    if (user._id.toString() === req.user._id.toString()) return next(ApiError.badRequest('Cannot delete your own account'));

    user.isActive = false;
    await user.save();
    ApiResponse.success(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(ApiError.notFound('User not found'));
    if (user._id.toString() === req.user._id.toString()) return next(ApiError.badRequest('Cannot change your own status'));

    user.isActive = !user.isActive;
    await user.save();
    ApiResponse.success(res, { user: user.toPublicJSON() }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, adminCount, employeeCount, departmentStats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'employee' }),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    ApiResponse.success(res, {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminCount,
      employees: employeeCount,
      byDepartment: departmentStats
    });
  } catch (error) {
    next(error);
  }
};

// ✅ FIXED: Reset Device ID using mongoose correctly
const resetDevice = async (req, res, next) => {
  try {
    // Direct MongoDB update to be safe
    const result = await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { trustedDeviceId: null } }
    );

    if (result.matchedCount === 0) return next(ApiError.notFound('User not found'));

    ApiResponse.success(res, null, 'Device binding reset successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  resetDevice // ✅ Exported
};