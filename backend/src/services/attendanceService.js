const dayjs = require('dayjs');
const mongoose = require('mongoose');
const XlsxPopulate = require('xlsx-populate');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { distanceMeters } = require('../utils/geo');
const { getDateBounds } = require('../utils/helpers');
const { ATTENDANCE_STATUS, LATE_THRESHOLD_MINUTES } = require('../utils/constants');

class AttendanceService {
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
        throw ApiError.forbidden(`You must be within ${radius}m of the company.`);
      }
    }

    const today = new Date();
    const { start, end } = getDateBounds(today);

    let attendance = await Attendance.findOne({ userId, date: { $gte: start, $lte: end } });

    if (attendance && (attendance.status === ATTENDANCE_STATUS.ABSENT || attendance.status === ATTENDANCE_STATUS.PENDING_ABSENCE)) {
      throw ApiError.badRequest('You have marked absence for today.');
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
    if (transportMethod) attendance.transportMethodIn = transportMethod;
    if (location) attendance.checkInLocation = { latitude: location.latitude, longitude: location.longitude, address: location.address || '' };

    if (transportMethod && transportMethod !== 'none') {
      attendance.transportEvents.push(transportMethod);
    }

    const checkInTime = dayjs(attendance.checkIn);
    const lateThreshold = dayjs(attendance.checkIn).hour(9).minute(LATE_THRESHOLD_MINUTES).second(0);
    if (checkInTime.isAfter(lateThreshold)) attendance.status = ATTENDANCE_STATUS.LATE;

    await attendance.save();
    return attendance;
  }

  static async checkOut(userId, location = null, notes = '', transportMethod = 'none') {
    const today = new Date();
    const { start, end } = getDateBounds(today);
    const attendance = await Attendance.findOne({ userId, date: { $gte: start, $lte: end } });

    if (!attendance) throw ApiError.badRequest('No check-in found');
    if (attendance.status === ATTENDANCE_STATUS.ABSENT || attendance.status === ATTENDANCE_STATUS.PENDING_ABSENCE) throw ApiError.badRequest('Marked as absent.');
    if (!attendance.checkIn) throw ApiError.badRequest('Must check in first');
    if (attendance.checkOut) throw ApiError.badRequest('Already checked out');

    attendance.checkOut = new Date();
    if (transportMethod) attendance.transportMethodOut = transportMethod;
    if (location) attendance.checkOutLocation = { latitude: location.latitude, longitude: location.longitude, address: location.address || '' };
    if (notes) attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;

    if (transportMethod && transportMethod !== 'none') {
      attendance.transportEvents.push(transportMethod);
    }

    // ✅ MANUALLY CALCULATE HOURS (Replacing pre-save hook)
    const checkInTime = dayjs(attendance.checkIn);
    const checkOutTime = dayjs(attendance.checkOut);
    const diffHours = checkOutTime.diff(checkInTime, 'hour', true);
    attendance.workHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
    
    if (attendance.workHours > 8) {
      attendance.overtimeHours = parseFloat((attendance.workHours - 8).toFixed(2));
    }

    await attendance.save();
    return attendance;
  }

  static async markAbsent(userId, data) {
    const today = new Date();
    const { start, end } = getDateBounds(today);
    let attendance = await Attendance.findOne({ userId, date: { $gte: start, $lte: end } });

    if (attendance && attendance.checkIn) throw new Error('Cannot mark absent: Already checked in.');
    if (!attendance) attendance = new Attendance({ userId, date: start });

    attendance.status = ATTENDANCE_STATUS.PENDING_ABSENCE;
    attendance.checkIn = null;
    attendance.checkOut = null;
    
    attendance.notes = typeof data === 'string' ? data : (data.notes || '');
    attendance.absenceType = data.type || '';
    attendance.absenceReason = data.reason || '';
    if (data.file) attendance.attachment = data.file.path;

    await attendance.save();
    return attendance;
  }

  static async approveAbsence(attendanceId) {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) throw ApiError.notFound('Record not found');
    if (attendance.status !== ATTENDANCE_STATUS.PENDING_ABSENCE) throw ApiError.badRequest('Not pending');
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
      Attendance.aggregate([{ $match: { date: { $gte: start, $lte: end } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Attendance.find({ date: { $gte: start, $lte: end } }).populate('userId', 'name employeeId department').sort({ checkIn: -1 }).limit(10)
    ]);
    return { stats: stats.reduce((acc, curr) => { acc[curr._id] = curr.count; return acc; }, {}), recentCheckIns };
  }

  static async getMonthlyReport(userId, year, month) {
    const startDate = dayjs().year(year).month(month - 1).startOf('month').toDate();
    const endDate = dayjs().year(year).month(month - 1).endOf('month').toDate();
    const attendances = await Attendance.find({ userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 });
    const daysInMonth = dayjs(startDate).daysInMonth();
    const summary = { totalDays: daysInMonth, workingDays: attendances.length, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, totalWorkHours: 0, totalOvertimeHours: 0, averageWorkHours: 0 };
    attendances.forEach(att => {
      if (att.status === 'pending-absence') return;
      summary[att.status === 'half-day' ? 'halfDay' : att.status === 'on-leave' ? 'onLeave' : att.status]++;
      summary.totalWorkHours += att.workHours || 0;
      summary.totalOvertimeHours += att.overtimeHours || 0;
    });
    if (summary.workingDays > 0) summary.averageWorkHours = parseFloat((summary.totalWorkHours / summary.workingDays).toFixed(2));
    return { summary, attendances };
  }

  static async getWassalniStats(startDate, endDate, employeeId = null) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const matchQuery = {
      date: { $gte: start, $lte: end },
      transportEvents: 'wassalni'
    };

    if (employeeId) matchQuery.userId = new mongoose.Types.ObjectId(employeeId);

    const projectStage = {
      userId: 1,
      coursesCount: {
        $size: {
          $filter: {
            input: '$transportEvents',
            as: 't',
            cond: { $eq: ['$$t', 'wassalni'] }
          }
        }
      }
    };

    const totalAgg = await Attendance.aggregate([
      { $match: matchQuery },
      { $project: projectStage },
      { $group: { _id: null, total: { $sum: '$coursesCount' } } }
    ]);
    const totalCourses = totalAgg[0]?.total || 0;

    const byDepartment = await Attendance.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.department': 1, ...projectStage } },
      { $group: { _id: '$user.department', count: { $sum: '$coursesCount' } } },
      { $sort: { count: -1 } }
    ]);

    const byEmployee = await Attendance.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.employeeId': 1, 'user.name': 1, 'user.department': 1, ...projectStage } },
      { $group: { _id: { id: '$user.employeeId', name: '$user.name', dept: '$user.department' }, count: { $sum: '$coursesCount' } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return { totalCourses, byDepartment, byEmployee };
  }

  static async generateWassalniExcel(startDate, endDate, employeeId = null) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const matchQuery = {
      date: { $gte: start, $lte: end },
      transportEvents: 'wassalni'
    };

    if (employeeId) matchQuery.userId = new mongoose.Types.ObjectId(employeeId);

    const records = await Attendance.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          employeeId: '$user.employeeId',
          name: '$user.name',
          department: '$user.department',
          date: '$date',
          courses: {
            $size: {
              $filter: {
                input: '$transportEvents',
                as: 't',
                cond: { $eq: ['$$t', 'wassalni'] }
              }
            }
          }
        }
      },
      { $sort: { employeeId: 1, date: 1 } }
    ]);

    const wb = await XlsxPopulate.fromBlankAsync();
    const sheet = wb.sheet(0);

    const headerStyle = (cell) => {
      cell.style({
        fill: 'ed7d31',
        fontColor: 'ffffff',
        bold: true,
        horizontalAlignment: 'left'
      });
    };

    sheet.cell('A1').value('EmployeeID').tap(headerStyle);
    sheet.cell('B1').value('Name').tap(headerStyle);
    sheet.cell('C1').value('Date').tap(headerStyle);
    sheet.cell('D1').value('Department').tap(headerStyle);
    sheet.cell('E1').value('Courses').tap(headerStyle);

    let row = 2;
    let totalCourses = 0;

    records.forEach(rec => {
      sheet.cell(`A${row}`).value(rec.employeeId);
      sheet.cell(`B${row}`).value(rec.name);
      sheet.cell(`C${row}`).value(dayjs(rec.date).format('YYYY-MM-DD'));
      sheet.cell(`D${row}`).value(rec.department);
      sheet.cell(`E${row}`).value(rec.courses).style({ horizontalAlignment: 'center' });
      totalCourses += rec.courses;
      row++;
    });

    sheet.cell(`A${row}`).value('Total Courses').style({ bold: true });
    sheet.cell(`E${row}`).value(totalCourses).style({ bold: true, horizontalAlignment: 'center' });

    sheet.column('A').width(15);
    sheet.column('B').width(25);
    sheet.column('C').width(15);
    sheet.column('D').width(30);
    sheet.column('E').width(10);

    return wb.outputAsync();
  }
}

module.exports = AttendanceService;