const dayjs = require('dayjs');
const Attendance = require('../models/Attendance');
const { ATTENDANCE_STATUS, LATE_THRESHOLD_MINUTES } = require('../utils/constants');
const { getDateBounds, getMonthBounds } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');
const { distanceMeters } = require('../utils/geo');

class AttendanceService {
  /**
   * Check in user
   */
  static async checkIn(userId, location = null, notes = '') {
    // 1) Geofence validation (before writing attendance)
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

    // 2) Find or create today's attendance
    const today = new Date();
    const { start, end } = getDateBounds(today);

    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: start, $lte: end }
    });

    if (attendance && attendance.checkIn) {
      throw ApiError.badRequest('Already checked in today');
    }

    if (!attendance) {
      attendance = new Attendance({
        userId,
        date: start,
      });
    }

    // 3) Apply check-in fields
    attendance.checkIn = new Date();
    attendance.status = ATTENDANCE_STATUS.PRESENT;

    if (notes) attendance.notes = notes;

    if (location) {
      attendance.checkInLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      };
    }

    // 4) Late logic (optional)
    const checkInTime = dayjs(attendance.checkIn);
    const lateThreshold = dayjs(attendance.checkIn).hour(9).minute(LATE_THRESHOLD_MINUTES).second(0);

    if (checkInTime.isAfter(lateThreshold)) {
      attendance.status = ATTENDANCE_STATUS.LATE;
    }

    await attendance.save();
    return attendance;
  }

  /**
   * Check out user
   */
  static async checkOut(userId, location = null, notes = '') {
    const today = new Date();
    const { start, end } = getDateBounds(today);

    const attendance = await Attendance.findOne({
      userId,
      date: { $gte: start, $lte: end }
    });

    if (!attendance) {
      throw new Error('No check-in found for today');
    }

    if (!attendance.checkIn) {
      throw new Error('Must check in before checking out');
    }

    if (attendance.checkOut) {
      throw new Error('Already checked out today');
    }

    attendance.checkOut = new Date();

    // Add location if provided
    if (location) {
      attendance.checkOutLocation = location;
    }

    if (notes) {
      attendance.notes = attendance.notes
        ? `${attendance.notes}; ${notes}`
        : notes;
    }

    // Work hours will be calculated in pre-save hook
    await attendance.save();
    return attendance;
  }

  /**
   * Get attendance statistics for dashboard
   */
  static async getStats(startDate, endDate) {
    const matchStage = {};

    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0
    };

    stats.forEach(stat => {
      result.total += stat.count;
      switch (stat._id) {
        case 'present':
          result.present = stat.count;
          break;
        case 'absent':
          result.absent = stat.count;
          break;
        case 'late':
          result.late = stat.count;
          break;
        case 'half-day':
          result.halfDay = stat.count;
          break;
        case 'on-leave':
          result.onLeave = stat.count;
          break;
      }
    });

    return result;
  }

  /**
   * Get today's attendance summary
   */
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

  /**
   * Get monthly report for a user
   */
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
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      totalWorkHours: 0,
      totalOvertimeHours: 0,
      averageWorkHours: 0
    };

    attendances.forEach(att => {
      summary[att.status === 'half-day' ? 'halfDay' : att.status === 'on-leave' ? 'onLeave' : att.status]++;
      summary.totalWorkHours += att.workHours || 0;
      summary.totalOvertimeHours += att.overtimeHours || 0;
    });

    if (summary.workingDays > 0) {
      summary.averageWorkHours = parseFloat((summary.totalWorkHours / summary.workingDays).toFixed(2));
    }

    return {
      summary,
      attendances
    };
  }
}

module.exports = AttendanceService;