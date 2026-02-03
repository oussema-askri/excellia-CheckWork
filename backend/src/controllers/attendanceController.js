const Attendance = require('../models/Attendance');
const AttendanceService = require('../services/attendanceService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');
const { getDateBounds } = require('../utils/helpers');
const dayjs = require('dayjs');

/**
 * @desc    Check in
 * @route   POST /api/attendance/check-in
 * @access  Private/Employee
 */
const checkIn = async (req, res, next) => {
  try {
    const { notes, location } = req.body;

    const attendance = await AttendanceService.checkIn(req.user._id, location, notes);
    await attendance.populate('userId', 'name employeeId email');

    ApiResponse.success(res, { attendance }, 'Checked in successfully');
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Check out
 * @route   POST /api/attendance/check-out
 * @access  Private/Employee
 */
const checkOut = async (req, res, next) => {
  try {
    const { notes, location } = req.body;

    const attendance = await AttendanceService.checkOut(req.user._id, location, notes);
    await attendance.populate('userId', 'name employeeId email');

    ApiResponse.success(res, { attendance }, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get today's attendance for current user
 * @route   GET /api/attendance/today
 * @access  Private
 */
const getTodayAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.getTodayAttendance(req.user._id);

    ApiResponse.success(res, { attendance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my attendance history
 * @route   GET /api/attendance/my
 * @access  Private
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate,
      status
    } = req.query;

    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    }

    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, attendances, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all attendance records
 * @route   GET /api/attendance
 * @access  Private/Admin
 */
const getAllAttendance = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate,
      status,
      userId,
      department
    } = req.query;

    // Build query
    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    }

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline for department filter
    let attendances, total;

    if (department) {
      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $match: {
            ...query,
            'user.department': { $regex: department, $options: 'i' }
          }
        },
        { $sort: { date: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNum }],
            count: [{ $count: 'total' }]
          }
        }
      ];

      const result = await Attendance.aggregate(pipeline);
      attendances = result[0].data;
      total = result[0].count[0]?.total || 0;
    } else {
      [attendances, total] = await Promise.all([
        Attendance.find(query)
          .populate('userId', 'name employeeId email department')
          .sort({ date: -1 })
          .skip(skip)
          .limit(limitNum),
        Attendance.countDocuments(query)
      ]);
    }

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, attendances, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's attendance
 * @route   GET /api/attendance/user/:id
 * @access  Private/Admin
 */
const getUserAttendance = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate
    } = req.query;

    const query = { userId: req.params.id };

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .populate('userId', 'name employeeId email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, attendances, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update attendance
 * @route   PUT /api/attendance/:id
 * @access  Private/Admin
 */
const updateAttendance = async (req, res, next) => {
  try {
    const allowedUpdates = ['checkIn', 'checkOut', 'status', 'notes'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('userId', 'name employeeId email');

    if (!attendance) {
      return next(ApiError.notFound('Attendance record not found'));
    }

    ApiResponse.success(res, { attendance }, 'Attendance updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete attendance
 * @route   DELETE /api/attendance/:id
 * @access  Private/Admin
 */
const deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      return next(ApiError.notFound('Attendance record not found'));
    }

    ApiResponse.success(res, null, 'Attendance deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendance/stats
 * @access  Private/Admin
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await AttendanceService.getStats(startDate, endDate);
    
    ApiResponse.success(res, { stats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance report
 * @route   GET /api/attendance/report
 * @access  Private/Admin
 */
const getAttendanceReport = async (req, res, next) => {
  try {
    const { userId, year, month } = req.query;

    if (!year || !month) {
      return next(ApiError.badRequest('Year and month are required'));
    }

    const report = await AttendanceService.getMonthlyReport(
      userId,
      parseInt(year),
      parseInt(month)
    );

    ApiResponse.success(res, { report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};