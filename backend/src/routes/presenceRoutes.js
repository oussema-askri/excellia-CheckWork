const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');

const {
  downloadMyPresenceSheet,
  listPresenceSheetsAdmin,
  adminGenerateAndDownloadForUser,
  adminDownloadPresenceSheetById,
  adminGenerateAllPresenceSheets
} = require('../controllers/presenceController');

router.use(protect);

// Employee
router.get('/my', downloadMyPresenceSheet);

// Admin
router.get('/admin/records', adminOnly, listPresenceSheetsAdmin);
router.get('/admin/user/:userId', adminOnly, adminGenerateAndDownloadForUser);
router.get('/admin/records/:id/download', adminOnly, adminDownloadPresenceSheetById);

// ✅ Generate ALL (store only)
router.post('/admin/generate-all', adminOnly, adminGenerateAllPresenceSheets);

module.exports = router;