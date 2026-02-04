const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { adminOnly, authorize } = require('../middleware/roleCheck'); // ✅ Import authorize

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

// ✅ Allow Zitouna + Admin to list/generate sheets
router.get('/admin/records', authorize('admin', 'zitouna'), listPresenceSheetsAdmin);
router.get('/admin/user/:userId', authorize('admin', 'zitouna'), adminGenerateAndDownloadForUser);
router.get('/admin/records/:id/download', authorize('admin', 'zitouna'), adminDownloadPresenceSheetById);
router.post('/admin/generate-all', authorize('admin', 'zitouna'), adminGenerateAllPresenceSheets);

module.exports = router;