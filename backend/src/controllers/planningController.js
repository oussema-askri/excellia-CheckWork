const fs = require('fs').promises;
const Planning = require('../models/Planning');
const User = require('../models/User');
const ExcelService = require('../services/excelService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');
const dayjs = require('dayjs');

/**
 * @desc    Upload planning Excel file
 * @route   POST /api/planning/upload
 * @access  Private/Admin
 */
const uploadPlanning = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(ApiError.badRequest('Please upload an Excel file'));
    }

    const filePath = req.file.path;

    try {
      const parseResult = await ExcelService.parseExcelFile(filePath);

      if (parseResult.validRows === 0) {
        await fs.unlink(filePath);
        return next(ApiError.badRequest('No valid data found in Excel file', parseResult.errors));
      }

      const saveResult = await ExcelService.savePlanningData(
        parseResult.data,
        req.user._id
      );

      await fs.unlink(filePath);

      ApiResponse.success(res, {
        batchId: saveResult.batchId,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        savedRows: saveResult.saved,
        parseErrors: parseResult.errors,
        saveErrors: saveResult.errors
      }, `Successfully imported ${saveResult.saved} planning entries`);
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all planning entries
 * @route   GET /api/planning
 * @access  Private (All authenticated users can read)
 */
const getAllPlanning = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate,
      employeeId,
      shift,
      department,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    } else if (startDate) {
      query.date = { $gte: dayjs(startDate).startOf('day').toDate() };
    } else if (endDate) {
      query.date = { $lte: dayjs(endDate).endOf('day').toDate() };
    }

    if (employeeId) {
      query.employeeId = { $regex: employeeId, $options: 'i' };
    }

    if (shift) {
      query.shift = { $regex: shift, $options: 'i' };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // First get planning with user info
    let plannings = await Planning.find(query)
      .populate('userId', 'name employeeId email department position')
      .populate('uploadedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // If department filter is specified, filter results
    if (department) {
      plannings = plannings.filter(p => p.userId?.department === department);
    }

    const total = await Planning.countDocuments(query);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, plannings, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my planning (employee)
 * @route   GET /api/planning/my
 * @access  Private
 */
const getMyPlanning = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate
    } = req.query;

    const query = {
      $or: [
        { userId: req.user._id },
        { employeeId: req.user.employeeId }
      ]
    };

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    } else {
      query.date = {
        $gte: dayjs().startOf('month').toDate(),
        $lte: dayjs().endOf('month').toDate()
      };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const [plannings, total] = await Promise.all([
      Planning.find(query)
        .populate('userId', 'name employeeId email department')
        .sort({ date: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Planning.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, plannings, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's planning
 * @route   GET /api/planning/user/:id
 * @access  Private/Admin
 */
const getUserPlanning = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      startDate,
      endDate
    } = req.query;

    const query = { userId: req.params.id };

    if (startDate && endDate) {
      query.date = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate()
      };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const [plannings, total] = await Promise.all([
      Planning.find(query)
        .populate('userId', 'name employeeId email department')
        .sort({ date: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Planning.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ApiResponse.paginated(res, plannings, pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single planning entry
 * @route   GET /api/planning/:id
 * @access  Private
 */
const getPlanning = async (req, res, next) => {
  try {
    const planning = await Planning.findById(req.params.id)
      .populate('userId', 'name employeeId email department')
      .populate('uploadedBy', 'name email');

    if (!planning) {
      return next(ApiError.notFound('Planning entry not found'));
    }

    ApiResponse.success(res, { planning });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update planning entry
 * @route   PUT /api/planning/:id
 * @access  Private/Admin
 */
const updatePlanning = async (req, res, next) => {
  try {
    const allowedUpdates = ['shift', 'startTime', 'endTime', 'notes', 'breakDuration'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const planning = await Planning.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('userId', 'name employeeId email department');

    if (!planning) {
      return next(ApiError.notFound('Planning entry not found'));
    }

    ApiResponse.success(res, { planning }, 'Planning updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete planning entry
 * @route   DELETE /api/planning/:id
 * @access  Private/Admin
 */
const deletePlanning = async (req, res, next) => {
  try {
    const planning = await Planning.findByIdAndDelete(req.params.id);

    if (!planning) {
      return next(ApiError.notFound('Planning entry not found'));
    }

    ApiResponse.success(res, null, 'Planning deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete batch upload
 * @route   DELETE /api/planning/batch/:batchId
 * @access  Private/Admin
 */
const deleteBatch = async (req, res, next) => {
  try {
    const result = await Planning.deleteMany({ uploadBatch: req.params.batchId });

    if (result.deletedCount === 0) {
      return next(ApiError.notFound('No entries found for this batch'));
    }

    ApiResponse.success(res, { deleted: result.deletedCount }, `Deleted ${result.deletedCount} planning entries`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download Excel template
 * @route   GET /api/planning/template
 * @access  Private/Admin
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = ExcelService.generateTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=planning_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all departments (for filter)
 * @route   GET /api/planning/departments
 * @access  Private
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await User.distinct('department', { 
      department: { $ne: '', $exists: true },
      isActive: true
    });

    ApiResponse.success(res, { departments: departments.filter(d => d) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPlanning,
  getAllPlanning,
  getMyPlanning,
  getUserPlanning,
  getPlanning,
  updatePlanning,
  deletePlanning,
  deleteBatch,
  downloadTemplate,
  getDepartments
};