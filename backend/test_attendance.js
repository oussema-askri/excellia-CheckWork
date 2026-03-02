const mongoose = require('mongoose');
const dayjs = require('dayjs');
require('dotenv').config();

const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const AttendanceService = require('./src/services/attendanceService');

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find a user or use the first one
        const user = await User.findOne({ email: process.env.ADMIN_EMAIL });
        if (!user) {
            console.log('No user found to test with');
            return;
        }

        const userId = user._id;

        // 1. Setup an active shift from yesterday late night (e.g., 11 PM)
        const yesterdayDate = dayjs().subtract(1, 'day').startOf('day').toDate();
        const yesterdayCheckInTime = dayjs().subtract(1, 'day').hour(23).minute(0).second(0).toDate();

        await Attendance.deleteMany({ userId }); // reset for clean test

        let attendance = new Attendance({
            userId,
            date: yesterdayDate,
            checkIn: yesterdayCheckInTime,
            status: 'present',
            transportMethodIn: 'personal' // to bypass validation
        });
        await attendance.save();

        console.log('=> Yesterday active shift created:', dayjs(attendance.checkIn).format('YYYY-MM-DD HH:mm:ss'));

        // 2. Test getTodayAttendance (should return yesterday's unclosed shift)
        const todayAttendance = await Attendance.getTodayAttendance(userId);
        if (todayAttendance && todayAttendance.checkOut === null) {
            console.log('=> getTodayAttendance SUCCESS: Retrieved unclosed shift from yesterday');
            console.log('   Shift Date:', dayjs(todayAttendance.date).format('YYYY-MM-DD'));
            console.log('   Check-In time:', dayjs(todayAttendance.checkIn).format('YYYY-MM-DD HH:mm:ss'));
        } else {
            console.log('=> getTodayAttendance FAIL: Did not retrieve unclosed shift from yesterday', todayAttendance);
        }

        // 3. Test checkIn today (should fail because of yesterday's active shift)
        try {
            // Stub location to pass geofence if required
            const location = { latitude: Number(process.env.COMPANY_LAT), longitude: Number(process.env.COMPANY_LNG) };
            await AttendanceService.checkIn(userId, location, 'Test Checkin Today', 'personal');
            console.log('=> checkIn SUCCESS (Unexpected): Allowed check-in despite active shift from yesterday');
        } catch (err) {
            console.log('=> checkIn BLOCKED (Expected):', err.message);
        }

        // 4. Test checkOut today (simulating it's now 1 AM and user wants to check out of yesterday's shift)
        // Wait, the test script runs at the *current* time, not 1 AM. It just runs when we execute it.
        // The point is that checkOut() doesn't receive a time argument, it uses new Date().
        // By checking out now, it will use current time as checkOut time and calculate hours from 11 PM yesterday.

        // Stub location
        const location = { latitude: Number(process.env.COMPANY_LAT), longitude: Number(process.env.COMPANY_LNG) };
        const checkedOutAtt = await AttendanceService.checkOut(userId, location, 'Late Checkout', 'personal');

        console.log('=> checkOut SUCCESS:', checkedOutAtt);
        console.log('   Checked Out Time:', dayjs(checkedOutAtt.checkOut).format('YYYY-MM-DD HH:mm:ss'));
        console.log('   Calculated Work Hours:', checkedOutAtt.workHours);

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

runTest();
