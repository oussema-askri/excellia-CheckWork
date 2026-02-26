const dayjs = require('dayjs');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const { distanceMeters } = require('../utils/geo');
const { getDateBounds } = require('../utils/helpers');
const { ATTENDANCE_STATUS, LATE_THRESHOLD_MINUTES } = require('../utils/constants');

class AttendanceService {
  static async checkIn(userId, location = null, notes = '', transportMethod = 'none') {
    // ... (Geofence logic omitted for brevity, assumed unchanged) ...
    const today = new Date();
    const { start, end } = getDateBounds(today);
    let attendance = await Attendance.findOne({ userId, date: { $gte: start, $lte: end } });

    if (attendance && (attendance.status === ATTENDANCE_STATUS.ABSENT || attendance.status === ATTENDANCE_STATUS.PENDING_ABSENCE)) {
      throw ApiError.badRequest('You have marked absence for today.');
    }
    if (attendance && attendance.checkIn) throw ApiError.badRequest('Already checked in today');

    if (!attendance) attendance = new Attendance({ userId, date: start });

    attendance.checkIn = new Date();
    attendance.status = ATTENDANCE_STATUS.PRESENT;
    if (notes) attendance.notes = notes;
    if (transportMethod) attendance.transportMethodIn = transportMethod;
    if (location) attendance.checkInLocation = location;

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
    if (location) attendance.checkOutLocation = location;
    if (notes) attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;

    await attendance.save();
    return attendance;
  }

  // ✅ FIXED: markAbsent correctly reads the data object
  static async markAbsent(userId, data) {
    // data structure: { notes, type, reason, file }
    const today = new Date();
    const { start, end } = getDateBounds(today);
    let attendance = await Attendance.findOne({ userId, date: { $gte: start, $lte: end } });

    if (attendance && attendance.checkIn) throw new Error('Cannot mark absent: Already checked in.');
    if (!attendance) attendance = new Attendance({ userId, date: start });

    attendance.status = ATTENDANCE_STATUS.PENDING_ABSENCE;
    attendance.checkIn = null;
    attendance.checkOut = null;
    
    // ✅ Extract fields correctly
    attendance.notes = typeof data === 'string' ? data : (data.notes || '');
    attendance.absenceType = data.type || '';
    attendance.absenceReason = data.reason || '';
    if (data.file) attendance.attachment = data.file.path; // Save file path

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

  static async getStats(startDate, endDate) { /* ... same as before ... */ }
  static async getTodaySummary() { /* ... same as before ... */ }
  static async getMonthlyReport(userId, year, month) { /* ... same as before ... */ }
  static async getWassalniStats(startDate, endDate, employeeId) { /* ... same as before ... */ }
}

module.exports = AttendanceService;