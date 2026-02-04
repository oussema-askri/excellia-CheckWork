const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ Import fs
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

// ✅ Ensure directories exist
const uploadDir = path.join(__dirname, '../../uploads/planning');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration for planning Excel files
const planningStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Re-check inside (just in case)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for Excel files
const excelFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ];
  
  const allowedExts = ['.xls', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only Excel files (.xls, .xlsx) are allowed'), false);
  }
};

// Upload configurations
const uploadPlanning = multer({
  storage: planningStorage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  uploadPlanning
};