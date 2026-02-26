const mongoose = require('mongoose');
const dayjs = require('dayjs');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'pending-absence'], 
    default: 'present' 
  },
  
  transportMethodIn: { type: String, enum: ['wassalni', 'personal', 'none'], default: 'none' },
  transportMethodOut: { type: String, enum: ['wassalni', 'personal', 'none'], default: 'none' },
  transportEvents: { type: [String], default: [] },

  absenceType: { type: String, default: '' },
  absenceReason: { type: String, default: '' },
  attachment: { type: String, default: '' },

  workHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  checkInLocation: { latitude: Number, longitude: Number, address: String },
  checkOutLocation: { latitude: Number, longitude: Number, address: String }
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// ✅ FIX: Standard function using 'next', NOT async.
// Using async + next() together causes issues in some Mongoose versions.
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const checkInTime = dayjs(this.checkIn);
    const checkOutTime = dayjs(this.checkOut);
    const diffHours = checkOutTime.diff(checkInTime, 'hour', true);
    this.workHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
    
    if (this.workHours > 8) {
      this.overtimeHours = parseFloat((this.workHours - 8).toFixed(2));
    }
  }
  next();
});

attendanceSchema.virtual('formattedDate').get(function() {
  return dayjs(this.date).format('YYYY-MM-DD');
});

attendanceSchema.virtual('formattedCheckIn').get(function() {
  return this.checkIn ? dayjs(this.checkIn).format('HH:mm:ss') : null;
});

attendanceSchema.virtual('formattedCheckOut').get(function() {
  return this.checkOut ? dayjs(this.checkOut).format('HH:mm:ss') : null;
});

attendanceSchema.statics.getTodayAttendance = async function(userId) {
  const startOfDay = dayjs().startOf('day').toDate();
  const endOfDay = dayjs().endOf('day').toDate();
  return this.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } })
    .populate('userId', 'name employeeId email');
};

attendanceSchema.statics.getByDateRange = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: { $gte: dayjs(startDate).startOf('day').toDate(), $lte: dayjs(endDate).endOf('day').toDate() }
  }).populate('userId', 'name employeeId email department').sort({ date: -1 });
};

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;