const fs = require('fs');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/User');
const PresenceSheet = require('../models/PresenceSheet');
const {
  generatePresenceWorkbookBuffer,
  generateAndStorePresenceSheet
} = require('../services/presenceSheetService');

const parseYearMonth = (req) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) {
    throw ApiError.badRequest('year and month are required. Example: ?year=2026&month=1');
  }
  return { year, month };
};

const parseYearMonthFromBody = (req) => {
  const year = Number(req.body?.year);
  const month = Number(req.body?.month);
  if (!year || !month || month < 1 || month > 12) {
    throw ApiError.badRequest('year and month are required in body. Example: { "year": 2026, "month": 1 }');
  }
  return { year, month };
};

// Employee: download on-the-fly
const downloadMyPresenceSheet = async (req, res, next) => {
  try {
    const { year, month } = parseYearMonth(req);

    const buffer = await generatePresenceWorkbookBuffer({
      user: req.user,
      year,
      month
    });

    const filename = `Feuille_de_presence_${req.user.employeeId}_${year}-${String(month).padStart(2, '0')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// Admin: list DB records for year/month
const listPresenceSheetsAdmin = async (req, res, next) => {
  try {
    const { year, month } = parseYearMonth(req);
    const { page = 1, limit = 200, userId } = req.query;

    const q = { year, month };
    if (userId) q.userId = userId;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      PresenceSheet.find(q)
        .populate('userId', 'name employeeId department')
        .populate('generatedBy', 'name email')
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PresenceSheet.countDocuments(q)
    ]);

    return ApiResponse.paginated(res, items, {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

// Admin: generate (or regenerate), store in DB, and return file buffer (download)
const adminGenerateAndDownloadForUser = async (req, res, next) => {
  try {
    const { year, month } = parseYearMonth(req);
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('Employee not found');

    const { record, buffer } = await generateAndStorePresenceSheet({
      user,
      year,
      month,
      generatedBy: req.user._id
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// Admin: download stored file by record ID
const adminDownloadPresenceSheetById = async (req, res, next) => {
  try {
    const record = await PresenceSheet.findById(req.params.id).lean();
    if (!record) throw ApiError.notFound('Presence sheet record not found');

    if (!fs.existsSync(record.filePath)) {
      throw ApiError.notFound('Stored file not found on disk. Please regenerate.');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);

    return fs.createReadStream(record.filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

// Admin: generate ALL (store only, no download)
const adminGenerateAllPresenceSheets = async (req, res, next) => {
  try {
    const { year, month } = parseYearMonthFromBody(req);
    const department = (req.body?.department || '').trim();

    const query = { role: 'employee', isActive: true };
    if (department) query.department = department;

    const employees = await User.find(query).sort({ name: 1 }).lean();

    let generated = 0;
    const errors = [];

    for (const emp of employees) {
      try {
        await generateAndStorePresenceSheet({
          user: emp,
          year,
          month,
          generatedBy: req.user._id
        });
        generated++;
      } catch (e) {
        errors.push({
          employeeId: emp.employeeId,
          name: emp.name,
          message: e.message
        });
      }
    }

    return ApiResponse.success(res, {
      year,
      month,
      department: department || null,
      totalEmployees: employees.length,
      generated,
      failed: errors.length,
      errors
    }, 'Presence sheets generated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  downloadMyPresenceSheet,
  listPresenceSheetsAdmin,
  adminGenerateAndDownloadForUser,
  adminDownloadPresenceSheetById,
  adminGenerateAllPresenceSheets
};