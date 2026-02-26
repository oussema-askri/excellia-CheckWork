const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const ApiError = require('../utils/ApiError');

// Ensure directories exist
const planningDir = path.join(__dirname, '../../uploads/planning');
const absenceDir = path.join(__dirname, '../../uploads/absence');

[planningDir, absenceDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Generic Storage Generator
const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Planning Upload
const uploadPlanning = multer({
  storage: createStorage(planningDir),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet') || file.originalname.match(/\.(xls|xlsx)$/)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only Excel files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ✅ Absence Upload (Images/PDF)
const uploadAbsence = multer({
  storage: createStorage(absenceDir),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only Images and PDF allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = {
  uploadPlanning,
  uploadAbsence // ✅ Exported
};