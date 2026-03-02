const mongoose = require('mongoose');
const dayjs = require('dayjs');
require('dotenv').config();

const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const AttendanceService = require('./src/services/attendanceService');
const assert = require('assert');

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne({ email: process.env.ADMIN_EMAIL });
        const userId = user._id;

        // 1. Setup yesterday active shift
        const yesterdayDate = dayjs().subtract(1, 'day').startOf('day').toDate();
        const yesterdayCheckInTime = dayjs().subtract(1, 'day').hour(23).minute(0).second(0).toDate();

        await Attendance.deleteMany({ userId });

        let attendance = new Attendance({
            userId,
            date: yesterdayDate,
            checkIn: yesterdayCheckInTime,
            status: 'present',
            transportMethodIn: 'personal' // to bypass validation
        });
        await attendance.save();

        // 2. Test getTodayAttendance
        const todayAttendance = await Attendance.getTodayAttendance(userId);
        assert.ok(todayAttendance, "Expected to retrieve an attendance record");
        assert.strictEqual(todayAttendance.checkOut, null, "Expected unclosed shift");
        assert.strictEqual(dayjs(todayAttendance.date).format('YYYY-MM-DD'), dayjs(yesterdayDate).format('YYYY-MM-DD'), "Expected yesterday's date");

        // 3. Test checkIn today (should be blocked)
        let checkInError = null;
        try {
            const location = { latitude: Number(process.env.COMPANY_LAT), longitude: Number(process.env.COMPANY_LNG) };
            await AttendanceService.checkIn(userId, location, 'Test Checkin Today', 'personal');
        } catch (err) {
            checkInError = err;
        }
        assert.ok(checkInError, "Expected checkIn to throw an error due to active shift");
        assert.match(checkInError.message, /active shift from yesterday/, "Expected specific error message");

        // 4. Test checkOut today
        const location = { latitude: Number(process.env.COMPANY_LAT), longitude: Number(process.env.COMPANY_LNG) };
        const checkedOutAtt = await AttendanceService.checkOut(userId, location, 'Late Checkout', 'personal');

        assert.ok(checkedOutAtt.checkOut, "Expected checkOut time to be set");
        assert.ok(checkedOutAtt.workHours > 0, "Expected workHours to be calculated");

        console.log("ALL TESTS PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (error) {
        console.error("TEST FAILED O NO:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
