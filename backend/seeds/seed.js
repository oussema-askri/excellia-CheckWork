const mongoose = require('mongoose');
require('dotenv').config();
const dayjs = require('dayjs');
require('dayjs/locale/fr');
dayjs.locale('fr');

const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Planning = require('../src/models/Planning');
const { v4: uuidv4 } = require('uuid');

// Config
const SEED_YEAR = 2026;
const MONTHS_TO_SEED = [2, 3]; // Feb, March
const ATTENDANCE_MONTHS = [2]; // Only Feb gets attendance

const SHIFT_DEFINITIONS = {
  0: { name: 'Shift 0', start: '08:00', end: '16:00' },
  1: { name: 'Shift 1', start: '06:00', end: '14:00' },
  2: { name: 'Shift 2', start: '14:00', end: '22:00' },
};

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
  console.log('  ✓ Database cleared');
};

const seedUsers = async () => {
  console.log('📝 Seeding users...');

  // Admin
  const admin = new User({
    employeeId: 'ADMIN001',
    name: 'System Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@excellia.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
    department: 'IT',
    position: 'System Admin',
    isActive: true,
    trustedDeviceId: null // ✅ Explicitly set
  });
  await admin.save();

  // 10 Employees
  const employeesData = [
    { name: 'Oussema Askri', dept: 'Direction Production SI' },
    { name: 'Zied Abdeltif', dept: 'Direction Production SI' },
    { name: 'Zied Guesmi', dept: 'Direction Production SI' },
    { name: 'Ala Eddine', dept: 'Direction Production SI' },
    { name: 'Fedi Ben Ali', dept: 'Direction Production SI' },
    { name: 'Yassine Jlassi', dept: 'Direction Production SI' },
    { name: 'Adnen Tounsi', dept: 'Direction Production SI' },
    { name: 'Sarah Connor', dept: 'HR' },
    { name: 'John Smith', dept: 'Marketing' },
    { name: 'Emily Blunt', dept: 'Marketing' },
  ];

  const createdEmployees = [];
  let idCounter = 1;

  for (const e of employeesData) {
    const emailName = e.name.toLowerCase().replace(/\s+/g, '.');
    const user = new User({
      employeeId: `EMP${String(idCounter++).padStart(3, '0')}`,
      name: e.name,
      email: `${emailName}@excellia.com`,
      password: 'Employee@123',
      role: 'employee',
      department: e.dept,
      position: 'Consultant',
      isActive: true,
      trustedDeviceId: null // ✅ Explicitly set
    });
    await user.save();
    createdEmployees.push(user);
  }

  console.log(`  ✓ Created 1 Admin + ${createdEmployees.length} Employees`);
  return { admin, employees: createdEmployees };
};

const getDateAtTime = (dateObj, timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return dayjs(dateObj).hour(h).minute(m).second(0).toDate();
};

const seedPlanningAndAttendance = async (admin, employees) => {
  console.log('\n📅 Generating Planning & Attendance...');
  
  let totalPlanning = 0;
  let totalAttendance = 0;
  const batchId = uuidv4();

  for (const month of MONTHS_TO_SEED) {
    const daysInMonth = dayjs(`${SEED_YEAR}-${month}-01`).daysInMonth();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${SEED_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = dayjs(dateStr);
      const dayOfWeek = dateObj.day();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const emp of employees) {
        let selectedShift = null;

        if (isWeekend) {
          if (Math.random() > 0.5) {
            const shiftKey = Math.floor(Math.random() * 3);
            selectedShift = SHIFT_DEFINITIONS[shiftKey];
          }
        } else {
          const shiftKey = Math.floor(Math.random() * 3);
          selectedShift = SHIFT_DEFINITIONS[shiftKey];
        }

        if (selectedShift) {
          const plan = new Planning({
            userId: emp._id,
            employeeId: emp.employeeId,
            employeeName: emp.name,
            date: dateObj.toDate(),
            shift: selectedShift.name,
            startTime: selectedShift.start,
            endTime: selectedShift.end,
            uploadBatch: batchId,
            uploadedBy: admin._id
          });
          await plan.save();
          totalPlanning++;

          if (ATTENDANCE_MONTHS.includes(month)) {
            // SKIP Oussema (EMP001) for attendance test
            if (emp.employeeId === 'EMP001') continue; 

            const randomOffsetStart = Math.floor(Math.random() * 20) - 10; 
            const randomOffsetEnd = Math.floor(Math.random() * 20) - 5; 

            const checkIn = dayjs(getDateAtTime(dateObj, selectedShift.start)).add(randomOffsetStart, 'minute');
            const checkOut = dayjs(getDateAtTime(dateObj, selectedShift.end)).add(randomOffsetEnd, 'minute');

            const att = new Attendance({
              userId: emp._id,
              date: dateObj.toDate(),
              checkIn: checkIn.toDate(),
              checkOut: checkOut.toDate(),
              status: randomOffsetStart > 15 ? 'late' : 'present',
              workHours: checkOut.diff(checkIn, 'hour', true).toFixed(2),
              notes: 'Auto-generated'
            });
            await att.save();
            totalAttendance++;
          }
        }
      }
    }
  }

  console.log(`  ✓ Planning Records: ${totalPlanning}`);
  console.log(`  ✓ Attendance Records: ${totalAttendance}`);
};

const seed = async () => {
  try {
    await connectDB();

    const isFresh = process.argv.includes('--fresh');
    if (isFresh) {
      await clearDatabase();
    }

    const { admin, employees } = await seedUsers();
    await seedPlanningAndAttendance(admin, employees);

    console.log('\n✅ Seeding completed successfully!');
    console.log('------------------------------------------------');
    console.log('Admin: admin@excellia.com / Admin@123');
    console.log('Employee: oussema.askri@excellia.com / Employee@123');
    console.log('------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();