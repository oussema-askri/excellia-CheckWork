const Attendance = require('../models/Attendance');
const AttendanceService = require('../services/attendanceService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');
const dayjs = require('dayjs');

// Strict Sanitizer
const cleanStr = (val) => (val ? String(val).trim() : undefined);

const checkIn = async (req, res, next) => {
  try {
    const { notes, location } = req.body;
    const attendance = await AttendanceService.checkIn(
      req.user._id,
      location,
      cleanStr(notes)
    );
    await attendance.populate('userId', 'name employeeId email');
    ApiResponse.success(res, { attendance }, 'Checked in successfully');
  } catch (error) { next(error); }
};

const checkOut = async (req, res, next) => {
  try {
    const { notes, location } = req.body;
    const attendance = await AttendanceService.checkOut(
      req.user._id,
      location,
      cleanStr(notes)
    );
    await attendance.populate('userId', 'name employeeId email');
    ApiResponse.success(res, { attendance }, 'Checked out successfully');
  } catch (error) { next(error); }
};

const markAbsent = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const attendance = await AttendanceService.markAbsent(
      req.user._id,
      cleanStr(notes)
    );
    await attendance.populate('userId', 'name employeeId email');
    ApiResponse.success(res, { attendance }, 'Marked as absent (Pending Approval)');
  } catch (error) { next(error); }
};

const approveAbsence = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.approveAbsence(cleanStr(req.params.id));
    ApiResponse.success(res, { attendance }, 'Absence approved');
  } catch (error) { next(error); }
};

const rejectAbsence = async (req, res, next) => {
  try {
    await AttendanceService.rejectAbsence(cleanStr(req.params.id));
    ApiResponse.success(res, null, 'Absence request rejected');
  } catch (error) { next(error); }
};

const getTodayAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.getTodayAttendance(req.user._id);
    ApiResponse.success(res, { attendance });
  } catch (error) { next(error); }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const startDate = cleanStr(req.query.startDate);
    const endDate = cleanStr(req.query.endDate);
    const status = cleanStr(req.query.status);

    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.date = { 
        $gte: dayjs(startDate).startOf('day').toDate(), 
        $lte: dayjs(endDate).endOf('day').toDate() 
      };
    }

    if (status) query.status = status;

    const [attendances, total] = await Promise.all([
      Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments(query)
    ]);
    ApiResponse.paginated(res, attendances, { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

const getAllAttendance = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const startDate = cleanStr(req.query.startDate);
    const endDate = cleanStr(req.query.endDate);
    const status = cleanStr(req.query.status);
    const userId = cleanStr(req.query.userId);
    const department = cleanStr(req.query.department);

    const query = {};

    if (startDate && endDate) {
      query.date = { 
        $gte: dayjs(startDate).startOf('day').toDate(), 
        $lte: dayjs(endDate).endOf('day').toDate() 
      };
    }

    if (status) query.status = status;
    if (userId) query.userId = userId;

    let attendances;
    let total;

    if (department) {
      // Use exact match or simple regex after cleaning to avoid injection
      const safeDeptRegex = new RegExp(`^${department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      
      const pipeline = [
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { ...query, 'user.department': safeDeptRegex } },
        { $sort: { date: -1 } },
        { $facet: { data: [{ $skip: skip }, { $limit: limit }], count: [{ $count: 'total' }] } }
      ];
      const result = await Attendance.aggregate(pipeline);
      attendances = result[0].data;
      total = result[0].count[0]?.total || 0;
    } else {
      [attendances, total] = await Promise.all([
        Attendance.find(query).populate('userId', 'name employeeId email department').sort({ date: -1 }).skip(skip).limit(limit),
        Attendance.countDocuments(query)
      ]);
    }
    ApiResponse.paginated(res, attendances, { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

const getUserAttendance = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const startDate = cleanStr(req.query.startDate);
    const endDate = cleanStr(req.query.endDate);
    const userId = cleanStr(req.params.id);

    const query = { userId };

    if (startDate && endDate) {
      query.date = { 
        $gte: dayjs(startDate).startOf('day').toDate(), 
        $lte: dayjs(endDate).endOf('day').toDate() 
      };
    }

    const [attendances, total] = await Promise.all([
      Attendance.find(query).populate('userId', 'name employeeId email').sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments(query)
    ]);
    ApiResponse.paginated(res, attendances, { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

const updateAttendance = async (req, res, next) => {
  try {
    const allowedUpdates = ['checkIn', 'checkOut', 'status', 'notes'];
    const updates = {};
    allowedUpdates.forEach(field => { 
      if (req.body[field] !== undefined) updates[field] = req.body[field]; 
    });
    const attendance = await Attendance.findByIdAndUpdate(cleanStr(req.params.id), { $set: updates }, { new: true, runValidators: true }).populate('userId', 'name employeeId email');
    if (!attendance) return next(ApiError.notFound('Attendance record not found'));
    ApiResponse.success(res, { attendance }, 'Attendance updated successfully');
  } catch (error) { next(error); }
};

const deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(cleanStr(req.params.id));
    if (!attendance) return next(ApiError.notFound('Attendance record not found'));
    ApiResponse.success(res, null, 'Attendance deleted successfully');
  } catch (error) { next(error); }
};

const getAttendanceStats = async (req, res, next) => {
  try {
    const startDate = cleanStr(req.query.startDate);
    const endDate = cleanStr(req.query.endDate);
    const stats = await AttendanceService.getStats(startDate, endDate);
    ApiResponse.success(res, { stats });
  } catch (error) { next(error); }
};

const getAttendanceReport = async (req, res, next) => {
  try {
    const userId = cleanStr(req.query.userId);
    const year = Number.parseInt(req.query.year, 10);
    const month = Number.parseInt(req.query.month, 10);

    if (!year || !month) return next(ApiError.badRequest('Year and month are required'));
    const report = await AttendanceService.getMonthlyReport(userId, year, month);
    ApiResponse.success(res, { report });
  } catch (error) { next(error); }
};

module.exports = {
  checkIn, checkOut, markAbsent, approveAbsence, rejectAbsence,
  getTodayAttendance, getMyAttendance, getAllAttendance, getUserAttendance,
  updateAttendance, deleteAttendance, getAttendanceStats, getAttendanceReport
};