module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
    ZITOUNA: 'zitouna'
  },

  // Attendance statuses
  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    PENDING_ABSENCE: 'pending-absence', // ✅ NEW
    LATE: 'late',
    HALF_DAY: 'half-day',
    ON_LEAVE: 'on-leave'
  },

  // Shift types
  SHIFT_TYPES: {
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    NIGHT: 'Night',
    FULL_DAY: 'Full Day'
  },

  // Standard work hours
  STANDARD_WORK_HOURS: 8,

  // Late threshold (minutes after shift start)
  LATE_THRESHOLD_MINUTES: 15,

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 1000
  },

  // Excel column mappings
  EXCEL_COLUMNS: {
    EMPLOYEE_ID: ['EmployeeID', 'Employee ID', 'EmpID', 'ID', 'employeeId'],
    NAME: ['Name', 'Employee Name', 'EmployeeName', 'Full Name', 'name'],
    DATE: ['Date', 'WorkDate', 'Work Date', 'Shift Date', 'date'],
    SHIFT: ['Shift', 'ShiftType', 'Shift Type', 'shift'],
    START_TIME: ['StartTime', 'Start Time', 'Start', 'From', 'startTime'],
    END_TIME: ['EndTime', 'End Time', 'End', 'To', 'endTime']
  }
};