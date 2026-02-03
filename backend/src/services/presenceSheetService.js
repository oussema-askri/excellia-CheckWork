const path = require('path');
const fs = require('fs/promises');
const XlsxPopulate = require('xlsx-populate');
const dayjs = require('dayjs');
require('dayjs/locale/fr');
dayjs.locale('fr');

const Attendance = require('../models/Attendance');
const Planning = require('../models/Planning');
const PresenceSheet = require('../models/PresenceSheet');
const ApiError = require('../utils/ApiError');

const TEMPLATE_PATH = path.join(__dirname, '../templates/feuille_presence_template.xlsx');

// Tasks Logic
const TASK_WEEKEND = 'Monitoring Appdynamics/Monétique/Elasticsearch';
const TASK_WEEKDAY = 'Assurer les tâches quotidiennes de fin de journée et la supervision de système monetique et des sauvegardes';

// Real Time Logic
function formatRealTimeRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  return `${dayjs(checkIn).format('HH:mm')} - ${dayjs(checkOut).format('HH:mm')}`;
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getShiftIndex(shiftStr) {
  if (!shiftStr) return null;
  const s = String(shiftStr).toLowerCase();
  const m = s.match(/shift\s*([0-2])/);
  if (m) return Number(m[1]);
  return null;
}

// 1. Find Headers
async function findHeaders(sheet) {
  const used = sheet.usedRange();
  if (!used) throw ApiError.badRequest('Template sheet appears empty.');

  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  let headerRow = null;
  let dateCol = null;
  let tasksCol = null;
  let timeCol = null;

  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      const v = sheet.cell(r, c).value();
      if (typeof v !== 'string') continue;

      if (v.trim() === 'Date') {
        for (let cc = 1; cc <= maxCol; cc++) {
          const vv = sheet.cell(r, cc).value();
          if (typeof vv !== 'string') continue;
          const tt = vv.trim();

          if (tt === 'Date') dateCol = cc;
          if (tt === 'Tâches et livrables') tasksCol = cc;
          if (tt === 'Temps') timeCol = cc;
        }

        if (dateCol && tasksCol && timeCol) {
          headerRow = r;
          return { headerRow, dateCol, tasksCol, timeCol, maxRow, maxCol };
        }
      }
    }
  }

  throw ApiError.badRequest('Could not find table headers in template.');
}

// 2. Set Top Labels
async function setLabelValueRight(sheet, labelText, valueToSet) {
  const used = sheet.usedRange();
  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      const v = sheet.cell(r, c).value();
      if (typeof v !== 'string') continue;
      if (v.trim() === labelText) {
        sheet.cell(r, c + 1).value(valueToSet);
        return true;
      }
    }
  }
  return false;
}

// 3. Set Bottom Signature
async function setSignaturePrestataireBelow(sheet, fullName) {
  const used = sheet.usedRange();
  const maxRow = used.endCell().rowNumber();
  const maxCol = used.endCell().columnNumber();

  for (let r = 1; r <= maxRow; r++) {
    let prestataireCol = null;
    let hasResponsableHeader = false;

    for (let c = 1; c <= maxCol; c++) {
      const v = sheet.cell(r, c).value();
      if (typeof v !== 'string') continue;
      const t = v.trim();
      if (t === 'Prestataire') prestataireCol = c;
      if (t === 'Responsable suivi de mission') hasResponsableHeader = true;
    }

    if (prestataireCol && hasResponsableHeader) {
      sheet.cell(r + 1, prestataireCol).value(fullName);
      return true;
    }
  }
  return false;
}

// 4. Build Data Maps
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
  for (const a of att) attendanceByDay.set(dayjs(a.date).date(), a);

  const planningByDay = new Map();
  for (const p of plans) planningByDay.set(dayjs(p.date).date(), p);

  return { attendanceByDay, planningByDay, daysInMonth: dayjs(start).daysInMonth() };
}

// 5. Generate Logic
async function generatePresenceWorkbookBuffer({ user, year, month }) {
  const wb = await XlsxPopulate.fromFileAsync(TEMPLATE_PATH);
  const sheet = wb.sheet(0);

  // Top Info
  await setLabelValueRight(sheet, 'Prestataire', user.name);
  const period = capitalizeFirst(dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY'));
  await setLabelValueRight(sheet, 'Période objet de la facturation', period);

  // Bottom Info
  await setSignaturePrestataireBelow(sheet, user.name);

  // Table Data
  const { headerRow, dateCol, tasksCol, timeCol, maxRow } = await findHeaders(sheet);
  const { attendanceByDay, planningByDay, daysInMonth } = await buildMonthMaps(user, year, month);

  // Loop through rows
  for (let r = headerRow + 1; r <= maxRow; r++) {
    const dayNum = r - headerRow; 

    if (dayNum > 31) break;

    // Clear extra days (29, 30, 31)
    if (dayNum > daysInMonth) {
      sheet.cell(r, dateCol).value('');
      sheet.cell(r, tasksCol).value('');
      sheet.cell(r, timeCol).value('');
      continue;
    }

    // Set Date Label
    const dateObj = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`);
    const dayName = capitalizeFirst(dateObj.format('dddd'));
    const isWeekend = [0, 6].includes(dateObj.day());

    let dateLabel = `${String(dayNum).padStart(2, '0')} du mois`;
    if (isWeekend) dateLabel += ` (${dayName})`;
    sheet.cell(r, dateCol).value(dateLabel);

    // Get Data
    const p = planningByDay.get(dayNum);
    const a = attendanceByDay.get(dayNum);
    const shiftIndex = getShiftIndex(p?.shift);

    // ✅ NEW LOGIC: If NO Attendance -> Empty everything (Task & Time)
    if (!a) {
      sheet.cell(r, tasksCol).value('');
      sheet.cell(r, timeCol).value('');
      continue; 
    }

    // If Attendance exists, we show Time & Task
    const realTime = formatRealTimeRange(a.checkIn, a.checkOut);
    sheet.cell(r, timeCol).value(realTime);

    if (shiftIndex === null) {
      // Attendance exists but No Planning -> Empty Task
      sheet.cell(r, tasksCol).value('');
    } else {
      // Attendance exists AND Planning exists -> Set Task
      const task = isWeekend ? TASK_WEEKEND : TASK_WEEKDAY;
      sheet.cell(r, tasksCol).value(task);
    }
  }

  return wb.outputAsync();
}

async function generateAndStorePresenceSheet({ user, year, month, generatedBy }) {
  const buffer = await generatePresenceWorkbookBuffer({ user, year, month });

  const folder = `uploads/presence/${year}-${String(month).padStart(2, '0')}`;
  await fs.mkdir(folder, { recursive: true });

  const fileName = `Feuille_de_presence_${user.employeeId}_${year}-${String(month).padStart(2, '0')}.xlsx`;
  const filePath = `${folder}/${fileName}`;

  await fs.writeFile(filePath, buffer);

  const record = await PresenceSheet.findOneAndUpdate(
    { userId: user._id, year, month },
    {
      userId: user._id,
      year,
      month,
      fileName,
      filePath,
      generatedBy,
      generatedAt: new Date(),
      size: buffer.length
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { record, buffer };
}

module.exports = {
  generatePresenceWorkbookBuffer,
  generateAndStorePresenceSheet
};