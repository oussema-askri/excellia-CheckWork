const mongoose = require('mongoose');
require('dotenv').config();
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Planning = require('../src/models/Planning');
const { v4: uuidv4 } = require('uuid');

const SEED_YEAR = 2026;
const SEED_MONTH = 2; // February

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Attendance.deleteMany({}),
    Planning.deleteMany({})
  ]);
};

// 1. Create Employees
const seedUsers = async () => {
  const admin = new User({
    employeeId: 'ADMIN001',
    name: 'System Administrator',
    email: 'admin@excellia.com',
    password: 'Admin@123',
    role: 'admin',
    department: 'IT',
    isActive: true
  });
  await admin.save();

  const employeesData = [
    { id: 'EMP001', name: 'Oussema Askri', email: 'oussema.askri@excellia.tn' },
    { id: 'EMP002', name: 'Fadi Hajri', email: 'fadi.hajri@excellia.tn' },
    { id: 'EMP003', name: 'Yassine Ben Yekhlef', email: 'yassine.ben@excellia.tn' },
    { id: 'EMP004', name: 'Adnen Rouissi', email: 'adnen.rouissi@excellia.tn' },
    { id: 'EMP005', name: 'Zied Guesmi', email: 'zied.guesmi@excellia.tn' },
    { id: 'EMP006', name: 'Ala Oueslati', email: 'ala.oueslati@excellia.tn' },
    { id: 'EMP007', name: 'Zied Abdellatif', email: 'zied.abdellatif@excellia.tn' }
  ];

  const employees = [];
  for (const e of employeesData) {
    const u = new User({
      employeeId: e.id,
      name: e.name,
      email: e.email,
      password: 'Employee@123',
      role: 'employee',
      department: 'Direction Production SI',
      position: 'Consultant',
      isActive: true,
      trustedDeviceId: null
    });
    await u.save();
    employees.push(u);
  }
  
  return { admin, employees };
};

// Helper: Parse HH:mm to Date
const setTime = (baseDate, timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return dayjs(baseDate).hour(h).minute(m).second(0).toDate();
};

// 2. Generate Schedule
const seedSchedule = async (admin, employees) => {
  console.log('📅 Generating Planning & Attendance based on screenshot...');
  const batchId = uuidv4();
  
  // Map ID to User Object for easy lookup
  const empMap = employees.reduce((acc, e) => ({ ...acc, [e.employeeId]: e }), {});

  // Default Times
  const SHIFTS = {
    'Excellia': { start: '08:00', end: '17:00' },
    'Shift 0': { start: '08:00', end: '16:00' },
    'Shift 1 Wk': { start: '18:00', end: '01:00' }, // Weekday
    'Shift 1 WEnd': { start: '16:00', end: '00:00' }, // Weekend
    'Shift 2 Wk': { start: '01:00', end: '08:00' }, // Weekday
    'Shift 2 WEnd': { start: '00:00', end: '08:00' }, // Weekend
  };

  // Specific Roster from Image (Overrides defaults)
  // Format: Date -> { EmployeeID: ShiftName }
  const ROSTER = {
    // Week 1
    1: { 'EMP002': 'Shift 1 WEnd', 'EMP003': 'Shift 2 WEnd', 'EMP004': 'Shift 0' },
    2: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    3: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    4: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    5: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    6: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    // Weekend 1
    7: { 'EMP005': 'Shift 0', 'EMP002': 'Shift 2 WEnd', 'EMP003': 'Shift 1 WEnd' },
    8: { 'EMP005': 'Shift 0', 'EMP002': 'Shift 2 WEnd', 'EMP003': 'Shift 1 WEnd' },
    // Week 2
    9: { 'EMP007': 'Shift 1 Wk', 'EMP005': 'Shift 2 Wk' },
    10: { 'EMP007': 'Shift 1 Wk', 'EMP005': 'Shift 2 Wk' },
    11: { 'EMP007': 'Shift 1 Wk', 'EMP005': 'Shift 2 Wk' },
    12: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' }, // Mix from image
    13: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    // Weekend 2
    14: { 'EMP006': 'Shift 2 WEnd', 'EMP003': 'Shift 0', 'EMP004': 'Shift 1 WEnd' },
    15: { 'EMP006': 'Shift 2 WEnd', 'EMP003': 'Shift 0', 'EMP004': 'Shift 1 WEnd' },
    // Week 3
    16: { 'EMP007': 'Shift 1 Wk', 'EMP006': 'Shift 2 Wk' },
    17: { 'EMP001': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    18: { 'EMP001': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    19: { 'EMP001': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    20: { 'EMP001': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    // Weekend 3
    21: { 'EMP005': 'Shift 0', 'EMP006': 'Shift 2 WEnd', 'EMP002': 'Shift 1 WEnd' },
    22: { 'EMP003': 'Shift 0', 'EMP006': 'Shift 2 WEnd', 'EMP002': 'Shift 1 WEnd' },
    // Week 4
    23: { 'EMP004': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    24: { 'EMP004': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    25: { 'EMP004': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    26: { 'EMP004': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    27: { 'EMP004': 'Shift 1 Wk', 'EMP007': 'Shift 2 Wk' },
    // End
    28: { 'EMP005': 'Shift 0' },
  };

  const daysInMonth = dayjs(`${SEED_YEAR}-${SEED_MONTH}-01`).daysInMonth();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${SEED_YEAR}-${String(SEED_MONTH).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = dayjs(dateStr);
    const dayOfWeek = dateObj.day(); // 0=Sun
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Loop through all employees for this day
    for (const emp of employees) {
      const overrides = ROSTER[day] || {};
      let assignedShift = null;
      let shiftName = '';

      if (overrides[emp.employeeId]) {
        // Explicit assignment from image
        shiftName = overrides[emp.employeeId];
        assignedShift = SHIFTS[shiftName];
      } else if (!isWeekend) {
        // Default weekday = Excellia
        shiftName = 'Excellia';
        assignedShift = SHIFTS['Excellia'];
      }
      // Else: Weekend with no assignment = OFF (No planning/attendance)

      if (assignedShift) {
        // Clean shift name for DB (Remove "Wk"/"WEnd" suffixes)
        const displayShift = shiftName.replace(' Wk', '').replace(' WEnd', '');

        // 1. Create Planning
        const plan = new Planning({
          userId: emp._id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          date: dateObj.toDate(),
          shift: displayShift,
          startTime: assignedShift.start,
          endTime: assignedShift.end,
          uploadBatch: batchId,
          uploadedBy: admin._id
        });
        await plan.save();

        // 2. Create Attendance
        // Handle overnight shifts (end time is next day)
        const startH = parseInt(assignedShift.start.split(':')[0]);
        const endH = parseInt(assignedShift.end.split(':')[0]);
        
        let checkInTime = setTime(dateObj, assignedShift.start);
        let checkOutTime = setTime(dateObj, assignedShift.end);

        if (endH < startH) {
          // Ends next day
          checkOutTime = dayjs(checkOutTime).add(1, 'day').toDate();
        }

        // Add random jitter (-5 to +5 mins)
        const jitterIn = Math.floor(Math.random() * 10) - 5;
        const jitterOut = Math.floor(Math.random() * 10) - 5;

        checkInTime = dayjs(checkInTime).add(jitterIn, 'minute').toDate();
        checkOutTime = dayjs(checkOutTime).add(jitterOut, 'minute').toDate();

        const att = new Attendance({
          userId: emp._id,
          date: dateObj.toDate(),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'present',
          workHours: dayjs(checkOutTime).diff(dayjs(checkInTime), 'hour', true).toFixed(2),
          notes: 'Auto-generated'
        });
        await att.save();
      }
    }
  }
};

const seed = async () => {
  try {
    await connectDB();
    await clearDatabase();
    
    const { admin, employees } = await seedUsers();
    await seedSchedule(admin, employees);

    console.log('\n✅ Seeding completed!');
    console.log('Admin: admin@excellia.com / Admin@123');
    console.log('Employees: Password is "Employee@123"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seed();