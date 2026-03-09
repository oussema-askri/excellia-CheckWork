const dayjs = require('dayjs');
const mongoose = require('mongoose');
const XlsxPopulate = require('xlsx-populate');
const Planning = require('../models/Planning');
const Attendance = require('../models/Attendance');

/**
 * Night shifts are "shift 1" and "shift 2" in the Planning model.
 * - byDepartment: LIVE count from Attendance (actual night shifts worked)
 * - byEmployee: Expected count from Planning (scheduled night shifts)
 */
class NightShiftService {
    /**
     * Get night shift statistics for a date range, optionally filtered by employee.
     */
    static async getNightShiftStats(startDate, endDate, employeeId = null) {
        const start = dayjs(startDate).startOf('day').toDate();
        const end = dayjs(endDate).endOf('day').toDate();

        const planningMatch = {
            date: { $gte: start, $lte: end },
            shift: { $regex: /^shift\s*[12]$/i }
        };

        if (employeeId) {
            planningMatch.userId = new mongoose.Types.ObjectId(employeeId);
        }

        // Total night shift count (from Planning - scheduled)
        const totalAgg = await Planning.aggregate([
            { $match: planningMatch },
            { $group: { _id: null, total: { $sum: 1 } } }
        ]);
        const totalNightShifts = totalAgg[0]?.total || 0;

        // By department (LIVE from Attendance - actual night shifts worked)
        const attendanceMatch = {
            date: { $gte: start, $lte: end },
            checkIn: { $ne: null }
        };
        if (employeeId) {
            attendanceMatch.userId = new mongoose.Types.ObjectId(employeeId);
        }

        const byDepartment = await Attendance.aggregate([
            { $match: attendanceMatch },
            // Lookup matching Planning record for same user + same day with night shift
            {
                $lookup: {
                    from: 'plannings',
                    let: { attUserId: '$userId', attDate: '$date' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', '$$attUserId'] },
                                        {
                                            $eq: [
                                                { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                                                { $dateToString: { format: '%Y-%m-%d', date: '$$attDate' } }
                                            ]
                                        }
                                    ]
                                },
                                shift: { $regex: /^shift\s*[12]$/i }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'nightPlan'
                }
            },
            // Keep only attendance records that had a night shift planned
            { $match: { 'nightPlan.0': { $exists: true } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $group: { _id: '$user.department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // By employee - expected/scheduled (from Planning)
        const byEmployee = await Planning.aggregate([
            { $match: planningMatch },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $group: {
                    _id: { id: '$user.employeeId', name: '$user.name', dept: '$user.department' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        // By shift type (shift 1 vs shift 2 breakdown - from Planning)
        const byShift = await Planning.aggregate([
            { $match: planningMatch },
            {
                $group: {
                    _id: { $toLower: '$shift' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return { totalNightShifts, byDepartment, byEmployee, byShift };
    }

    /**
     * Generate an Excel report of night shift records.
     */
    static async generateNightShiftExcel(startDate, endDate, employeeId = null) {
        const start = dayjs(startDate).startOf('day').toDate();
        const end = dayjs(endDate).endOf('day').toDate();

        const matchQuery = {
            date: { $gte: start, $lte: end },
            shift: { $regex: /^shift\s*[12]$/i }
        };

        if (employeeId) {
            matchQuery.userId = new mongoose.Types.ObjectId(employeeId);
        }

        const records = await Planning.aggregate([
            { $match: matchQuery },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    employeeId: '$user.employeeId',
                    name: '$user.name',
                    department: '$user.department',
                    date: '$date',
                    shift: '$shift',
                    startTime: '$startTime',
                    endTime: '$endTime'
                }
            },
            { $sort: { employeeId: 1, date: 1 } }
        ]);

        const wb = await XlsxPopulate.fromBlankAsync();
        const sheet = wb.sheet(0);

        const headerStyle = (cell) => {
            cell.style({
                fill: '4f46e5',
                fontColor: 'ffffff',
                bold: true,
                horizontalAlignment: 'left'
            });
        };

        sheet.cell('A1').value('EmployeeID').tap(headerStyle);
        sheet.cell('B1').value('Name').tap(headerStyle);
        sheet.cell('C1').value('Date').tap(headerStyle);
        sheet.cell('D1').value('Department').tap(headerStyle);
        sheet.cell('E1').value('Shift').tap(headerStyle);
        sheet.cell('F1').value('Start Time').tap(headerStyle);
        sheet.cell('G1').value('End Time').tap(headerStyle);

        let row = 2;
        records.forEach(rec => {
            sheet.cell(`A${row}`).value(rec.employeeId);
            sheet.cell(`B${row}`).value(rec.name);
            sheet.cell(`C${row}`).value(dayjs(rec.date).format('YYYY-MM-DD'));
            sheet.cell(`D${row}`).value(rec.department);
            sheet.cell(`E${row}`).value(rec.shift);
            sheet.cell(`F${row}`).value(rec.startTime);
            sheet.cell(`G${row}`).value(rec.endTime);
            row++;
        });

        sheet.cell(`A${row}`).value('Total Night Shifts').style({ bold: true });
        sheet.cell(`E${row}`).value(records.length).style({ bold: true, horizontalAlignment: 'center' });

        sheet.column('A').width(15);
        sheet.column('B').width(25);
        sheet.column('C').width(15);
        sheet.column('D').width(30);
        sheet.column('E').width(12);
        sheet.column('F').width(12);
        sheet.column('G').width(12);

        return wb.outputAsync();
    }
}

module.exports = NightShiftService;
