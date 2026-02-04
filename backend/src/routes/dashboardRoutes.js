const express = require('express');
const router = express.Router();

const {
  getStats,
  getTodaySummary,
  getWeeklySummary,
  getMonthlySummary
} = require('../controllers/dashboardController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'zitouna'));

router.get('/stats', getStats);
router.get('/today', getTodaySummary);
router.get('/weekly', getWeeklySummary);
router.get('/monthly', getMonthlySummary);

module.exports = router;