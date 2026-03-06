const path = require('path');
const fs = require('fs/promises');
const XlsxPopulate = require('xlsx-populate');
const dayjs = require('dayjs');
require('dayjs/locale/fr');
dayjs.locale('fr');
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
    'Réception et analyse des tickets entrants, Puis attribution des tickets aux groupes de techniciens et aux techniciens spécifiques',
  consultant:
    'Assurer les tâches quotidiennes de fin de journée et la supervision de système monétique et des sauvegardes Traitement des tickets T24 et GED',
  monetique:
    'Traitement des procedures techniques, Observation Exploitation monétique, Resolutions des tickets',
};

/** Weekend tasks per role (if needed – falls back to weekday task for now) */
const WEEKEND_TASKS = {
  dom: WEEKDAY_TASKS.dom,
  consultant: 'Monitoring AppDynamics/Monétique/Elasticsearch',
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
      // Support both French and English for backward compatibility or transition
      if (trimmed === 'Date') dateCol = c;
      if (trimmed === 'Tâches et livrables' || trimmed === 'Tasks and Deliverables') tasksCol = c;
      if (trimmed === 'Temps' || trimmed === 'Time') timeCol = c;
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

// ─── Monthly summary & fixed cells ──────────────────────────────────────────

/**
 * Count worked and absent days for the month, then write the totals and
 * fixed labels/names to the bottom section of the sheet.
 *
 * Fixed cell layout:
 *   B44 = "Congé"                       C44 = absent count
 *   B45 = "Total jours travaillés"      C45 = worked count (checkIn + checkOut only)
 *   B46 = "Responsable d'équipe"        C46 = "Responsable suivi de mission"
 *   B47 = "Aymen Selmi"                 C47 = "Moez Dhehibi"
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
    } else if (a.checkIn && a.checkOut) {
      // Only count as worked if the employee checked in AND checked out
      worked += 1;
    }
  }

  // Row 44 – Congé / absences
  sheet.cell(44, 2).value('Congé');                           // B44
  sheet.cell(44, 3).value(absent);                            // C44

  // Row 45 – Total jours travaillés
  sheet.cell(45, 2).value('Total jours travaillés');           // B45
  sheet.cell(45, 3).value(worked);                            // C45

  // Row 46 – Signature labels
  sheet.cell(46, 2).value("Responsable d'équipe");             // B46
  sheet.cell(46, 3).value('Responsable suivi de mission');     // C46

  // Row 47 – Signature names
  sheet.cell(47, 2).value('Aymen Selmi');                      // B47
  sheet.cell(47, 3).value('Moez Dhehibi');                     // C47
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
  let dateLabel = `${String(dayNum).padStart(2, '0')} du mois`;
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

  // A5 = "Prestataire" label, B5 = employee's name
  sheet.cell(5, 1).value('Prestataire');                     // A5
  sheet.cell(5, 2).value(user.name);                          // B5

  const period = capitalizeFirst(
    dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY')
  );

  let periodSet = await setLabelValueRight(sheet, 'Billing Period', period);
  if (!periodSet) await setLabelValueRight(sheet, 'Période objet de la facturation', period);

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