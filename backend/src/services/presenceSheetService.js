const path = require('path');
const fs = require('fs/promises');
const XlsxPopulate = require('xlsx-populate');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Tunisia is always UTC+1 (no DST)
const TZ = 'Africa/Tunis';

const Attendance = require('../models/Attendance');
const Planning = require('../models/Planning');
const PresenceSheet = require('../models/PresenceSheet');
const ApiError = require('../utils/ApiError');

// ─── Role-based configuration ────────────────────────────────────────────────

/**
 * Normalise the employee's position string to one of the three known roles:
 * 'dom' | 'consultant' | 'monetique'
 * Falls back to 'consultant' if unrecognised.
 */
function getEmployeeRole(user) {
  const pos = (user.position || '').toLowerCase().trim();
  if (pos.includes('dom')) return 'dom';
  if (pos.includes('monetique') || pos.includes('monétique')) return 'monetique';
  return 'consultant'; // default
}

const TEMPLATE_PATHS = {
  dom: path.join(__dirname, '../templates/Dom-template.xlsx'),
  consultant: path.join(__dirname, '../templates/Consultant-template.xlsx'),
  monetique: path.join(__dirname, '../templates/Monetique-template.xlsx'),
};

/** Weekday tasks per role */
const WEEKDAY_TASKS = {
  dom:
    'Receive and analyze incoming tickets, then assign tickets to technician groups and specific technicians',
  consultant:
    'Perform daily end-of-day tasks and supervise the card system and backups, handle support tickets',
  monetique:
    'Process technical procedures, monitor card system operations, resolve support tickets',
};

/** Weekend tasks per role (if needed – falls back to weekday task for now) */
const WEEKEND_TASKS = {
  dom: WEEKDAY_TASKS.dom,
  consultant: 'Monitoring AppDynamics/Card System/Elasticsearch',
  monetique: WEEKDAY_TASKS.monetique,
};

// ─── Utility helpers ─────────────────────────────────────────────────────────

function formatRealTimeRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  return `${dayjs(checkIn).tz(TZ).format('HH:mm')} - ${dayjs(checkOut).tz(TZ).format('HH:mm')}`;
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getShiftIndex(shiftStr) {
  if (!shiftStr) return null;
  const s = String(shiftStr).toLowerCase();
  const m = s.match(/shift\s*([0-2])/);
  if (m) return Number.parseInt(m[1], 10);
  return null;
}

// ─── Sheet scanning helpers ───────────────────────────────────────────────────

function scanRowForHeaders(sheet, rowIndex, maxCol) {
  let dateCol = null;
  let tasksCol = null;
  let timeCol = null;

  for (let c = 1; c <= maxCol; c++) {
    const val = sheet.cell(rowIndex, c).value();
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === 'Date') dateCol = c;
      if (trimmed === 'Tâches et livrables') tasksCol = c;
      if (trimmed === 'Temps') timeCol = c;
    }
  }

  if (dateCol && tasksCol && timeCol) {
    return { dateCol, tasksCol, timeCol };
  }
  return null;
}

async function findHeaders(sheet) {
  const used = sheet.usedRange();
  if (!used) throw ApiError.badRequest('Template sheet appears empty.');

  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  for (let r = 1; r <= maxRow; r++) {
    const headers = scanRowForHeaders(sheet, r, maxCol);
    if (headers) {
      return { headerRow: r, ...headers, maxRow, maxCol };
    }
  }

  throw ApiError.badRequest('Could not find table headers in template.');
}

async function setLabelValueRight(sheet, labelText, valueToSet) {
  const used = sheet.usedRange();
  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      const v = sheet.cell(r, c).value();
      if (typeof v === 'string' && v.trim() === labelText) {
        sheet.cell(r, c + 1).value(valueToSet);
        return true;
      }
    }
  }
  return false;
}

function scanRowForSignature(sheet, rowIndex, maxCol) {
  let prestataireCol = null;
  let hasResponsable = false;

  for (let c = 1; c <= maxCol; c++) {
    const v = sheet.cell(rowIndex, c).value();
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === 'Prestataire') prestataireCol = c;
      if (t === 'Responsable suivi de mission') hasResponsable = true;
    }
  }
  return { prestataireCol, hasResponsable };
}

async function setSignaturePrestataireBelow(sheet, fullName) {
  const used = sheet.usedRange();
  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  for (let r = 1; r <= maxRow; r++) {
    const { prestataireCol, hasResponsable } = scanRowForSignature(sheet, r, maxCol);

    if (prestataireCol && hasResponsable) {
      sheet.cell(r + 1, prestataireCol).value(fullName);
      return true;
    }
  }
  return false;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function buildMonthMaps(user, year, month) {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
  const end = dayjs(start).endOf('month').toDate();

  const [att, plans] = await Promise.all([
    Attendance.find({ userId: user._id, date: { $gte: start, $lte: end } }).lean(),
    Planning.find({
      $or: [{ userId: user._id }, { employeeId: user.employeeId }],
      date: { $gte: start, $lte: end },
    }).lean(),
  ]);

  const attendanceByDay = new Map();
  att.forEach(a => attendanceByDay.set(dayjs(a.date).date(), a));

  const planningByDay = new Map();
  plans.forEach(p => planningByDay.set(dayjs(p.date).date(), p));

  return { attendanceByDay, planningByDay, daysInMonth: dayjs(start).daysInMonth() };
}

// ─── Monthly summary ────────────────────────────────────────────────────────

/**
 * Count worked and absent days for the month, then write the totals to
 * fixed cells C44 (congé / absences) and C45 (total jours travaillés).
 */
function writeMonthlySummary(sheet, { attendanceByDay, daysInMonth, year, month }) {
  let worked = 0;
  let absent = 0;

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = dayjs(
      `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    );
    const isWeekend = [0, 6].includes(dateObj.day());
    if (isWeekend) continue; // only count weekdays

    const a = attendanceByDay.get(dayNum);
    if (!a) continue; // no record = day not tracked

    if (a.status === 'absent') {
      absent += 1;
    } else {
      worked += 1;
    }
  }

  // C44 → congé / absences count
  sheet.cell(44, 3).value(absent);
  // C45 → total jours travaillés
  sheet.cell(45, 3).value(worked);
}

// ─── Row filling ──────────────────────────────────────────────────────────────

function fillRow(
  sheet,
  r,
  { dateCol, tasksCol, timeCol, dayNum, year, month, daysInMonth, attendanceByDay, planningByDay, role }
) {
  if (dayNum > daysInMonth) {
    sheet.cell(r, dateCol).value('');
    sheet.cell(r, tasksCol).value('');
    sheet.cell(r, timeCol).value('');
    return;
  }

  const dateObj = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`);
  const dayName = capitalizeFirst(dateObj.format('dddd'));
  const isWeekend = [0, 6].includes(dateObj.day());
  let dateLabel = `${String(dayNum).padStart(2, '0')} of the month`;
  if (isWeekend) dateLabel += ` (${dayName})`;
  sheet.cell(r, dateCol).value(dateLabel);

  const p = planningByDay.get(dayNum);
  const a = attendanceByDay.get(dayNum);
  const shiftIndex = getShiftIndex(p?.shift);

  if (a && a.status === 'absent') {
    sheet.cell(r, tasksCol).value('Absent');
    sheet.cell(r, timeCol).value('');
    return;
  }

  const realTime = a ? formatRealTimeRange(a.checkIn, a.checkOut) : '';
  sheet.cell(r, timeCol).value(realTime);

  // Only write the task if the employee actually checked in AND checked out
  const didWork = a && a.checkIn && a.checkOut;
  if (didWork) {
    const task = isWeekend ? WEEKEND_TASKS[role] : WEEKDAY_TASKS[role];
    sheet.cell(r, tasksCol).value(task);
  } else {
    sheet.cell(r, tasksCol).value('');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function generatePresenceWorkbookBuffer({ user, year, month }) {
  // Determine which template to use based on the employee's position
  const role = getEmployeeRole(user);
  const templatePath = TEMPLATE_PATHS[role];

  const wb = await XlsxPopulate.fromFileAsync(templatePath);
  const sheet = wb.sheet(0);

  await setLabelValueRight(sheet, 'Prestataire', user.name);
  const period = capitalizeFirst(
    dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY')
  );
  await setLabelValueRight(sheet, 'Période objet de la facturation', period);
  await setSignaturePrestataireBelow(sheet, user.name);

  const { headerRow, dateCol, tasksCol, timeCol, maxRow } = await findHeaders(sheet);
  const { attendanceByDay, planningByDay, daysInMonth } = await buildMonthMaps(user, year, month);

  for (let r = headerRow + 1; r <= maxRow; r++) {
    const dayNum = r - headerRow;
    if (dayNum > 31) break;
    fillRow(sheet, r, {
      dateCol, tasksCol, timeCol,
      dayNum, year, month, daysInMonth,
      attendanceByDay, planningByDay,
      role,
    });
  }

  // Write totals: C44 = absences, C45 = jours travaillés
  writeMonthlySummary(sheet, { attendanceByDay, daysInMonth, year, month });

  return wb.outputAsync();
}

async function generateAndStorePresenceSheet({ user, year, month, generatedBy }) {
  const buffer = await generatePresenceWorkbookBuffer({ user, year, month });
  const folder = `uploads/presence/${year}-${String(month).padStart(2, '0')}`;
  await fs.mkdir(folder, { recursive: true });
  const fileName = `Presence_Sheet_${user.employeeId}_${year}-${String(month).padStart(2, '0')}.xlsx`;
  const filePath = `${folder}/${fileName}`;
  await fs.writeFile(filePath, buffer);

  const record = await PresenceSheet.findOneAndUpdate(
    { userId: user._id, year, month },
    { userId: user._id, year, month, fileName, filePath, generatedBy, generatedAt: new Date(), size: buffer.length },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { record, buffer };
}

module.exports = { generatePresenceWorkbookBuffer, generateAndStorePresenceSheet };