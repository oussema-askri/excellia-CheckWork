const mongoose = require('mongoose');
const dayjs = require('dayjs');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  status: { type: String, enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'pending-absence'], default: 'present' },
  
  transportMethodIn: { type: String, enum: ['wassalni', 'personal', 'none'], default: 'none' },
  transportMethodOut: { type: String, enum: ['wassalni', 'personal', 'none'], default: 'none' },
  // Keep legacy array for backward compatibility if needed, or remove it. 
  // We switched to In/Out fields recently, but let's keep array definition to avoid crash if data exists.
  transportEvents: { type: [String], default: [] },

  // ✅ NEW ABSENCE FIELDS
  absenceType: { type: String, enum: ['Repos', 'Maladie', 'Other', ''], default: '' },
  absenceReason: { type: String, default: '' },
  attachment: { type: String, default: '' }, // Path to file

  workHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  checkInLocation: { latitude: Number, longitude: Number, address: String },
  checkOutLocation: { latitude: Number, longitude: Number, address: String }
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

attendanceSchema.pre('save', async function() {
  if (this.checkIn && this.checkOut) {
    const checkInTime = dayjs(this.checkIn);
    const checkOutTime = dayjs(this.checkOut);
    const diffHours = checkOutTime.diff(checkInTime, 'hour', true);
    this.workHours = Math.max(0, parseFloat(diffHours.toFixed(2)));
    if (this.workHours > 8) {
      this.overtimeHours = parseFloat((this.workHours - 8).toFixed(2));
    }
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;