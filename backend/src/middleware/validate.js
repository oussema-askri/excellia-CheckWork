const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value // Log the value that failed
    }));
    
    // ✅ DEBUG LOGS (Check these in Render Dashboard)
    console.error('❌ VALIDATION FAILED ON:', req.originalUrl);
    console.error('📩 Body received:', JSON.stringify(req.body, null, 2));
    console.error('⚠️ Errors:', JSON.stringify(extractedErrors, null, 2));
    
    return next(new ApiError(400, 'Validation failed', extractedErrors));
  }
  
  next();
};

module.exports = validate;