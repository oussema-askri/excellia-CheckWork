const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Planning = require('../models/Planning');
const AttendanceService = require('../services/attendanceService');
const ApiResponse = require('../utils/ApiResponse');
const { getDateBounds, getWeekBounds, getMonthBounds } = require('../utils/helpers');
const dayjs = require('dayjs');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 */
const getStats = async (req, res, next) => {
  try {
    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDateBounds(today);
    const { start: monthStart, end: monthEnd } = getMonthBounds(today);

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      monthlyAttendance,
      todayPlanning
    ] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'employee', isActive: true }),
      Attendance.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Planning.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } })
    ]);

    // Transform attendance stats
    const todayStats = {
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0
    };
    todayAttendance.forEach(stat => {
      if (stat._id === 'present') todayStats.present = stat.count;
      else if (stat._id === 'absent') todayStats.absent = stat.count;
      else if (stat._id === 'late') todayStats.late = stat.count;
      else if (stat._id === 'on-leave') todayStats.onLeave = stat.count;
    });

    const monthlyStats = {
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      total: 0
    };
    monthlyAttendance.forEach(stat => {
      monthlyStats.total += stat.count;
      if (stat._id === 'present') monthlyStats.present = stat.count;
      else if (stat._id === 'absent') monthlyStats.absent = stat.count;
      else if (stat._id === 'late') monthlyStats.late = stat.count;
      else if (stat._id === 'on-leave') monthlyStats.onLeave = stat.count;
    });

    ApiResponse.success(res, {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees
      },
      today: {
        ...todayStats,
        scheduledShifts: todayPlanning,
        checkedIn: todayStats.present + todayStats.late,
        notCheckedIn: activeEmployees - (todayStats.present + todayStats.late)
      },
      monthly: monthlyStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's summary
 * @route   GET /api/dashboard/today
 * @access  Private/Admin
 */
const getTodaySummary = async (req, res, next) => {
  try {
    const summary = await AttendanceService.getTodaySummary();
    
    ApiResponse.success(res, { summary });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get weekly summary
 * @route   GET /api/dashboard/weekly
 * @access  Private/Admin
 */
const getWeeklySummary = async (req, res, next) => {
  try {
    const { start, end } = getWeekBounds(new Date());

    const dailyStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          stats: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Transform data for chart
    const weekDays = [];
    let currentDate = dayjs(start);
    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayStats = dailyStats.find(d => d._id === dateStr);
      
      const dayData = {
        date: dateStr,
        day: currentDate.format('ddd'),
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0
      };

      if (dayStats) {
        dayStats.stats.forEach(stat => {
          if (stat.status === 'present') dayData.present = stat.count;
          else if (stat.status === 'absent') dayData.absent = stat.count;
          else if (stat.status === 'late') dayData.late = stat.count;
          else if (stat.status === 'on-leave') dayData.onLeave = stat.count;
        });
      }

      weekDays.push(dayData);
      currentDate = currentDate.add(1, 'day');
    }

    ApiResponse.success(res, { weekDays });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly summary
 * @route   GET /api/dashboard/monthly
 * @access  Private/Admin
 */
const getMonthlySummary = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    
    const targetYear = parseInt(year) || dayjs().year();
    const targetMonth = parseInt(month) || dayjs().month() + 1;

    const startDate = dayjs().year(targetYear).month(targetMonth - 1).startOf('month').toDate();
    const endDate = dayjs().year(targetYear).month(targetMonth - 1).endOf('month').toDate();

    const [attendanceStats, topPerformers, departmentStats] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate }, status: 'present' } },
        { $group: { _id: '$userId', presentDays: { $sum: 1 }, totalHours: { $sum: '$workHours' } } },
        { $sort: { presentDays: -1, totalHours: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            employeeId: '$user.employeeId',
            department: '$user.department',
            presentDays: 1,
            totalHours: 1
          }
        }
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
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
          $group: {
            _id: '$user.department',
            totalAttendance: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            }
          }
        },
        { $sort: { totalAttendance: -1 } }
      ])
    ]);

    const stats = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0
    };

    attendanceStats.forEach(stat => {
      stats.total += stat.count;
      if (stat._id === 'present') stats.present = stat.count;
      else if (stat._id === 'absent') stats.absent = stat.count;
      else if (stat._id === 'late') stats.late = stat.count;
      else if (stat._id === 'half-day') stats.halfDay = stat.count;
      else if (stat._id === 'on-leave') stats.onLeave = stat.count;
    });

    ApiResponse.success(res, {
      month: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
      stats,
      topPerformers,
      departmentStats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getTodaySummary,
  getWeeklySummary,
  getMonthlySummary
};