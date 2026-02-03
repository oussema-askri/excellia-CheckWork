const dayjs = require('dayjs');

/**
 * Get start and end of day for a given date
 */
const getDateBounds = (date) => {
  const day = dayjs(date);
  return {
    start: day.startOf('day').toDate(),
    end: day.endOf('day').toDate()
  };
};

/**
 * Get start and end of week
 */
const getWeekBounds = (date) => {
  const day = dayjs(date);
  return {
    start: day.startOf('week').toDate(),
    end: day.endOf('week').toDate()
  };
};

/**
 * Get start and end of month
 */
const getMonthBounds = (date) => {
  const day = dayjs(date);
  return {
    start: day.startOf('month').toDate(),
    end: day.endOf('month').toDate()
  };
};

/**
 * Parse date string to Date object
 */
const parseDate = (dateString) => {
  const formats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY/MM/DD',
    'DD-MM-YYYY'
  ];
  
  for (const format of formats) {
    const parsed = dayjs(dateString, format);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }
  
  // Try native Date parsing
  const nativeDate = new Date(dateString);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }
  
  return null;
};

/**
 * Format time to HH:mm
 */
const formatTime = (time) => {
  if (!time) return null;
  
  // If already in HH:mm format
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return time.padStart(5, '0');
  }
  
  // If it's a Date object or timestamp
  const parsed = dayjs(time);
  if (parsed.isValid()) {
    return parsed.format('HH:mm');
  }
  
  return null;
};

/**
 * Calculate work hours between two times
 */
const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  const start = dayjs(checkIn);
  const end = dayjs(checkOut);
  const hours = end.diff(start, 'hour', true);
  
  return Math.max(0, parseFloat(hours.toFixed(2)));
};

/**
 * Generate employee ID
 */
const generateEmployeeId = async (User) => {
  const lastUser = await User.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  if (!lastUser || !lastUser.employeeId) {
    return 'EMP001';
  }
  
  const lastNum = parseInt(lastUser.employeeId.replace('EMP', ''), 10);
  const newNum = (lastNum + 1).toString().padStart(3, '0');
  
  return `EMP${newNum}`;
};

/**
 * Sanitize string for safe use
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  getDateBounds,
  getWeekBounds,
  getMonthBounds,
  parseDate,
  formatTime,
  calculateWorkHours,
  generateEmployeeId,
  sanitizeString,
  isValidObjectId
};