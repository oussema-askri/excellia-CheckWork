const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const User = require('../models/User');
const Planning = require('../models/Planning');
const { EXCEL_COLUMNS } = require('../utils/constants');
const ApiError = require('../utils/ApiError');

dayjs.extend(customParseFormat);

class ExcelService {
  /**
   * Parse Excel file and extract planning data
   */
  static async parseExcelFile(filePath) {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '',
        raw: false 
      });

      if (!rawData || rawData.length === 0) {
        throw ApiError.badRequest('Excel file is empty or has no valid data');
      }

      // Get column headers from first row
      const headers = Object.keys(rawData[0]);
      
      // Map columns
      const columnMap = this.mapColumns(headers);
      
      // Validate required columns
      this.validateRequiredColumns(columnMap);
      
      // Parse and validate each row
      const parsedData = [];
      const errors = [];
      
      rawData.forEach((row, index) => {
        const rowNumber = index + 2; // Excel rows start at 1, plus header row
        try {
          const parsedRow = this.parseRow(row, columnMap, rowNumber);
          if (parsedRow) {
            parsedData.push(parsedRow);
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            message: error.message
          });
        }
      });

      return {
        data: parsedData,
        errors,
        totalRows: rawData.length,
        validRows: parsedData.length
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Map Excel headers to our expected columns
   */
  static mapColumns(headers) {
    const columnMap = {};
    
    // Find Employee ID column
    columnMap.employeeId = headers.find(h => 
      EXCEL_COLUMNS.EMPLOYEE_ID.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );
    
    // Find Name column
    columnMap.name = headers.find(h => 
      EXCEL_COLUMNS.NAME.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );
    
    // Find Date column
    columnMap.date = headers.find(h => 
      EXCEL_COLUMNS.DATE.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );
    
    // Find Shift column
    columnMap.shift = headers.find(h => 
      EXCEL_COLUMNS.SHIFT.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );
    
    // Find Start Time column
    columnMap.startTime = headers.find(h => 
      EXCEL_COLUMNS.START_TIME.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );
    
    // Find End Time column
    columnMap.endTime = headers.find(h => 
      EXCEL_COLUMNS.END_TIME.some(col => 
        col.toLowerCase() === h.toLowerCase().trim()
      )
    );

    return columnMap;
  }

  /**
   * Validate that all required columns are present
   */
  static validateRequiredColumns(columnMap) {
    const requiredColumns = ['employeeId', 'name', 'date', 'shift', 'startTime', 'endTime'];
    const missing = requiredColumns.filter(col => !columnMap[col]);
    
    if (missing.length > 0) {
      throw ApiError.badRequest(
        `Missing required columns: ${missing.join(', ')}. Expected columns: EmployeeID, Name, Date, Shift, StartTime, EndTime`
      );
    }
  }

  /**
   * Parse a single row of data
   */
  static parseRow(row, columnMap, rowNumber) {
    const employeeId = String(row[columnMap.employeeId] || '').trim().toUpperCase();
    const name = String(row[columnMap.name] || '').trim();
    const dateValue = row[columnMap.date];
    const shift = String(row[columnMap.shift] || '').trim();
    const startTime = this.parseTime(row[columnMap.startTime]);
    const endTime = this.parseTime(row[columnMap.endTime]);

    // Validate Employee ID
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }

    // Validate Name
    if (!name) {
      throw new Error('Name is required');
    }

    // Parse and validate Date
    const parsedDate = this.parseDate(dateValue);
    if (!parsedDate) {
      throw new Error(`Invalid date format: ${dateValue}`);
    }

    // Validate Shift
    if (!shift) {
      throw new Error('Shift is required');
    }

    // Validate Times
    if (!startTime) {
      throw new Error('Invalid start time format');
    }
    if (!endTime) {
      throw new Error('Invalid end time format');
    }

    return {
      employeeId,
      employeeName: name,
      date: parsedDate,
      shift,
      startTime,
      endTime
    };
  }

  /**
   * Parse date from various formats
   */
  static parseDate(value) {
    if (!value) return null;

    // If it's already a Date object
    if (value instanceof Date && !isNaN(value)) {
      return value;
    }

    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date;
    }

    // Try various string formats
    const formats = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'YYYY/MM/DD',
      'DD-MM-YYYY',
      'D/M/YYYY',
      'M/D/YYYY'
    ];

    const stringValue = String(value).trim();
    
    for (const format of formats) {
      const parsed = dayjs(stringValue, format, true);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    // Try native Date parsing
    const nativeDate = new Date(stringValue);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate;
    }

    return null;
  }

  /**
   * Parse time to HH:mm format
   */
  static parseTime(value) {
    if (!value) return null;

    const stringValue = String(value).trim();

    // Already in HH:mm format
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(stringValue)) {
      return stringValue.padStart(5, '0');
    }

    // Handle H:mm format
    if (/^[0-9]:[0-5][0-9]$/.test(stringValue)) {
      return '0' + stringValue;
    }

    // Handle decimal time (e.g., 0.375 = 9:00)
    if (typeof value === 'number' && value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Try parsing with dayjs
    const formats = ['HH:mm', 'H:mm', 'HH:mm:ss', 'h:mm A', 'h:mm a'];
    for (const format of formats) {
      const parsed = dayjs(stringValue, format, true);
      if (parsed.isValid()) {
        return parsed.format('HH:mm');
      }
    }

    return null;
  }

  /**
   * Save parsed planning data to database
   */
  static async savePlanningData(parsedData, uploadedBy) {
    const batchId = uuidv4();
    const savedEntries = [];
    const errors = [];

    // Get all users for linking
    const users = await User.find({});
    const userMap = new Map(users.map(u => [u.employeeId.toUpperCase(), u]));

    for (let i = 0; i < parsedData.length; i++) {
      const entry = parsedData[i];
      try {
        // Find matching user
        const user = userMap.get(entry.employeeId.toUpperCase());

        const planning = new Planning({
          userId: user ? user._id : null,
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          date: entry.date,
          shift: entry.shift,
          startTime: entry.startTime,
          endTime: entry.endTime,
          uploadBatch: batchId,
          uploadedBy
        });

        await planning.save();
        savedEntries.push(planning);
      } catch (error) {
        errors.push({
          row: i + 1,
          employeeId: entry.employeeId,
          message: error.message
        });
      }
    }

    return {
      batchId,
      saved: savedEntries.length,
      errors,
      entries: savedEntries
    };
  }

  /**
   * Generate Excel template
   */
  static generateTemplate() {
    const data = [
      {
        EmployeeID: 'EMP001',
        Name: 'John Doe',
        Date: dayjs().format('YYYY-MM-DD'),
        Shift: 'Morning',
        StartTime: '09:00',
        EndTime: '17:00'
      },
      {
        EmployeeID: 'EMP002',
        Name: 'Jane Smith',
        Date: dayjs().format('YYYY-MM-DD'),
        Shift: 'Afternoon',
        StartTime: '14:00',
        EndTime: '22:00'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planning');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // EmployeeID
      { wch: 20 }, // Name
      { wch: 12 }, // Date
      { wch: 12 }, // Shift
      { wch: 10 }, // StartTime
      { wch: 10 }  // EndTime
    ];

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = ExcelService;