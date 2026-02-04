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
const { adminOnly, authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { uploadPlanning: uploadMiddleware } = require('../config/multer');
const {
  updatePlanningValidator,
  listPlanningValidator,
  planningIdValidator,
  batchIdValidator
} = require('../validators/planningValidator');

router.use(protect);

// Employee
router.get('/my', listPlanningValidator, validate, getMyPlanning);

// ✅ Admin Only: Download Template (MUST BE BEFORE getAllPlanning or /:id)
router.get('/template', adminOnly, downloadTemplate);

// Everyone (including Zitouna) can see planning list
router.get('/', listPlanningValidator, validate, getAllPlanning);

// ✅ Allow Zitouna to get user specific or single item
router.get('/user/:id', authorize('admin', 'zitouna'), getUserPlanning);

// Upload (Admin Only)
router.post('/upload', adminOnly, uploadMiddleware.single('file'), uploadPlanning);

// Batch Delete (Admin Only)
router.delete('/batch/:batchId', adminOnly, batchIdValidator, validate, deleteBatch);

// Single Item Routes (ID must be valid MongoID)
router.route('/:id')
  .get(authorize('admin', 'zitouna'), planningIdValidator, validate, getPlanning)
  .put(adminOnly, updatePlanningValidator, validate, updatePlanning)
  .delete(adminOnly, planningIdValidator, validate, deletePlanning);

module.exports = router;