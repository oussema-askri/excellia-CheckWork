const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const planningRoutes = require('./planningRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const presenceRoutes = require('./presenceRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/planning', planningRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/presence', presenceRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'Excellia API',
    version: '1.0.0',
    description: 'Employee Attendance & Planning System',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      attendance: '/api/attendance',
      planning: '/api/planning',
      dashboard: '/api/dashboard'
    }
  });
});

module.exports = router;