const dayjs = require('dayjs');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { distanceMeters } = require('../utils/geo');
const { getDateBounds } = require('../utils/helpers');
const { ATTENDANCE_STATUS, LATE_THRESHOLD_MINUTES } = require('../utils/constants');

class AttendanceService {
  // ✅ Updated checkIn to accept transportMethod
  static async checkIn(userId, location = null, notes = '', transportMethod = 'none') {
    const requireGeo = String(process.env.REQUIRE_GEOFENCE || 'false') === 'true';

    if (requireGeo) {
      const companyLat = Number(process.env.COMPANY_LAT);
      const companyLng = Number(process.env.COMPANY_LNG);
      const radius = Number(process.env.CHECKIN_RADIUS_METERS || 100);

      const lat = location?.latitude;
      const lng = location?.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw ApiError.badRequest('Location is required to check in.');
      }

      const dist = distanceMeters(lat, lng, companyLat, companyLng);

      if (dist > radius) {
        throw ApiError.forbidden(
          `You must be within ${radius}m of the company to check in. Current distance: ${Math.round(dist)}m.`
        );
      }
    }

    const today = new Date();
    const { start, end } = getDateBounds(today);

    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: start, $lte: end }
    });

    if (attendance && (attendance.status === ATTENDANCE_STATUS.ABSENT || attendance.status === ATTENDANCE_STATUS.PENDING_ABSENCE)) {
      throw ApiError.badRequest('You have marked absence for today. Cannot check in.');
    }

    if (attendance && attendance.checkIn) {
      throw ApiError.badRequest('Already checked in today');
    }

    if (!attendance) {
      attendance = new Attendance({ userId, date: start });
    }

    attendance.checkIn = new Date();
    attendance.status = ATTENDANCE_STATUS.PRESENT;
    if (notes) attendance.notes = notes;
    
    // ✅ Set Transport
    if (transportMethod) attendance.transportMethod = transportMethod;

    if (location) {
      attendance.checkInLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      };
    }

    const checkInTime = dayjs(attendance.checkIn);
    const lateThreshold = dayjs(attendance.checkIn).hour(9).minute(LATE_THRESHOLD_MINUTES).second(0);

    if (checkInTime.isAfter(lateThreshold)) {
      attendance.status = ATTENDANCE_STATUS.LATE;
    }

    await attendance.save();
    return attendance;
  }

  static async checkOut(userId, location = null, notes = '') {
    const today = new Date();
    const { start, end } = getDateBounds(today);

    const attendance = await Attendance.findOne({
      userId,
      date: { $gte: start, $lte: end }
    });

    if (!attendance) throw ApiError.badRequest('No check-in found for today');

    if (attendance.status === ATTENDANCE_STATUS.ABSENT || attendance.status === ATTENDANCE_STATUS.PENDING_ABSENCE) {
      throw ApiError.badRequest('Marked as absent. Cannot check out.');
    }

    if (!attendance.checkIn) throw ApiError.badRequest('Must check in before checking out');
    if (attendance.checkOut) throw ApiError.badRequest('Already checked out today');

    attendance.checkOut = new Date();
    
    if (location) {
      attendance.checkOutLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      };
    }

    if (notes) {
      attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
    }

    await attendance.save();
    return attendance;
  }

  static async markAbsent(userId, notes = '') {
    const today = new Date();
    const { start, end } = getDateBounds(today);

    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: start, $lte: end }
    });

    if (attendance) {
      if (attendance.checkIn) {
        throw new Error('Cannot mark absent: Already checked in today.');
      }
    } else {
      attendance = new Attendance({ userId, date: start });
    }

    attendance.status = ATTENDANCE_STATUS.PENDING_ABSENCE;
    attendance.checkIn = null;
    attendance.checkOut = null;
    if (notes) attendance.notes = notes;

    await attendance.save();
    return attendance;
  }

  static async approveAbsence(attendanceId) {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) throw ApiError.notFound('Record not found');
    
    if (attendance.status !== ATTENDANCE_STATUS.PENDING_ABSENCE) {
      throw ApiError.badRequest('This record is not pending approval');
    }

    attendance.status = ATTENDANCE_STATUS.ABSENT;
    await attendance.save();
    return attendance;
  }

  static async rejectAbsence(attendanceId) {
    const attendance = await Attendance.findByIdAndDelete(attendanceId);
    if (!attendance) throw ApiError.notFound('Record not found');
    return attendance;
  }

  static async getStats(startDate, endDate) {
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const stats = await Attendance.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, pending: 0 };

    stats.forEach(stat => {
      result.total += stat.count;
      switch (stat._id) {
        case 'present': result.present = stat.count; break;
        case 'absent': result.absent = stat.count; break;
        case 'late': result.late = stat.count; break;
        case 'half-day': result.halfDay = stat.count; break;
        case 'on-leave': result.onLeave = stat.count; break;
        case 'pending-absence': result.pending = stat.count; break;
      }
    });

    return result;
  }

  static async getTodaySummary() {
    const { start, end } = getDateBounds(new Date());
    
    const [stats, recentCheckIns] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Attendance.find({ date: { $gte: start, $lte: end } })
        .populate('userId', 'name employeeId department')
        .sort({ checkIn: -1 })
        .limit(10)
    ]);

    return {
      stats: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentCheckIns
    };
  }

  static async getMonthlyReport(userId, year, month) {
    const startDate = dayjs().year(year).month(month - 1).startOf('month').toDate();
    const endDate = dayjs().year(year).month(month - 1).endOf('month').toDate();

    const attendances = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const daysInMonth = dayjs(startDate).daysInMonth();
    
    const summary = {
      totalDays: daysInMonth,
      workingDays: attendances.length,
      present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0,
      totalWorkHours: 0, totalOvertimeHours: 0, averageWorkHours: 0
    };

    attendances.forEach(att => {
      if (att.status === 'pending-absence') return; 
      summary[att.status === 'half-day' ? 'halfDay' : att.status === 'on-leave' ? 'onLeave' : att.status]++;
      summary.totalWorkHours += att.workHours || 0;
      summary.totalOvertimeHours += att.overtimeHours || 0;
    });

    if (summary.workingDays > 0) {
      summary.averageWorkHours = parseFloat((summary.totalWorkHours / summary.workingDays).toFixed(2));
    }

    return { summary, attendances };
  }

  // ✅ NEW: Wassalni Stats Service
  static async getWassalniStats(startDate, endDate) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    // 1. Total Wassalni Courses
    const totalCourses = await Attendance.countDocuments({
      date: { $gte: start, $lte: end },
      transportMethod: 'wassalni'
    });

    // 2. By Department
    const byDepartment = await Attendance.aggregate([
      { 
        $match: { 
          date: { $gte: start, $lte: end }, 
          transportMethod: 'wassalni' 
        } 
      },
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
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. By Employee
    const byEmployee = await Attendance.aggregate([
      { 
        $match: { 
          date: { $gte: start, $lte: end }, 
          transportMethod: 'wassalni' 
        } 
      },
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
          _id: { id: '$user.employeeId', name: '$user.name', dept: '$user.department' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 } // Top 20 users
    ]);

    return { totalCourses, byDepartment, byEmployee };
  }
}

module.exports = AttendanceService;