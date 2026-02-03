const express = require('express');
const router = express.Router();

const {
  getStats,
  getTodaySummary,
  getWeeklySummary,
  getMonthlySummary
} = require('../controllers/dashboardController');

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/today', getTodaySummary);
router.get('/weekly', getWeeklySummary);
router.get('/monthly', getMonthlySummary);

module.exports = router;