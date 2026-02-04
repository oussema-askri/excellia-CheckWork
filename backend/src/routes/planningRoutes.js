const express = require('express');
const router = express.Router();

const {
  uploadPlanning,
  getAllPlanning,
  getMyPlanning,
  getUserPlanning,
  getPlanning,
  updatePlanning,
  deletePlanning,
  deleteBatch,
  downloadTemplate
} = require('../controllers/planningController');

const { protect } = require('../middleware/auth');
const { adminOnly, authorize } = require('../middleware/roleCheck'); // ✅ Import authorize
const validate = require('../middleware/validate');
const { uploadPlanning: uploadMiddleware } = require('../config/multer');
const {
  updatePlanningValidator,
  listPlanningValidator,
  planningIdValidator,
  batchIdValidator
} = require('../validators/planningValidator');

// All routes require authentication
router.use(protect);

// Routes accessible by all authenticated users
router.get('/my', listPlanningValidator, validate, getMyPlanning);
router.get('/', listPlanningValidator, validate, getAllPlanning); // Allow all to read
// ✅ Allow Zitouna to get single planning item or specific user planning
router.get('/user/:id', authorize('admin', 'zitouna'), getUserPlanning);
router.get('/:id', authorize('admin', 'zitouna'), planningIdValidator, validate, getPlanning);

// Admin only routes
router.get('/template', adminOnly, downloadTemplate);
router.post('/upload', adminOnly, uploadMiddleware.single('file'), uploadPlanning);
router.get('/user/:id', adminOnly, getUserPlanning);
router.delete('/batch/:batchId', adminOnly, batchIdValidator, validate, deleteBatch);

router.route('/:id')
  .get(planningIdValidator, validate, getPlanning)
  .put(adminOnly, updatePlanningValidator, validate, updatePlanning)
  .delete(adminOnly, planningIdValidator, validate, deletePlanning);

module.exports = router;