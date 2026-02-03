const mongoose = require('mongoose');
const dayjs = require('dayjs');

const planningSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
    uppercase: true
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  shift: {
    type: String,
    required: [true, 'Shift is required'],
    trim: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format']
  },
  breakDuration: {
    type: Number,
    default: 60,
    min: 0
  },
  uploadBatch: {
    type: String,
    required: [true, 'Upload batch ID is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploaded by user is required']
  },
  notes: {
    type: String,
    default: '',
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
planningSchema.index({ employeeId: 1, date: 1 });
planningSchema.index({ userId: 1, date: 1 });
planningSchema.index({ date: 1 });
planningSchema.index({ uploadBatch: 1 });
planningSchema.index({ shift: 1 });

// Virtual for formatted date
planningSchema.virtual('formattedDate').get(function() {
  return dayjs(this.date).format('YYYY-MM-DD');
});

// Virtual for day of week
planningSchema.virtual('dayOfWeek').get(function() {
  return dayjs(this.date).format('dddd');
});

// Virtual for calculated shift duration
planningSchema.virtual('shiftDuration').get(function() {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const durationMinutes = endMinutes - startMinutes - this.breakDuration;
  return parseFloat((durationMinutes / 60).toFixed(2));
});

// Pre-save hook - ASYNC WITHOUT next()
planningSchema.pre('save', async function() {
  if (!this.userId && this.employeeId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findOne({ employeeId: this.employeeId.toUpperCase() });
      if (user) {
        this.userId = user._id;
      }
    } catch (error) {
      console.error('Error linking planning to user:', error.message);
    }
  }
});

// Static methods
planningSchema.statics.getByEmployeeAndDateRange = async function(employeeId, startDate, endDate) {
  return this.find({
    employeeId: employeeId.toUpperCase(),
    date: {
      $gte: dayjs(startDate).startOf('day').toDate(),
      $lte: dayjs(endDate).endOf('day').toDate()
    }
  }).sort({ date: 1 });
};

planningSchema.statics.getByUserIdAndDateRange = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: dayjs(startDate).startOf('day').toDate(),
      $lte: dayjs(endDate).endOf('day').toDate()
    }
  }).sort({ date: 1 });
};

planningSchema.statics.deleteByBatch = async function(batchId) {
  return this.deleteMany({ uploadBatch: batchId });
};

const Planning = mongoose.model('Planning', planningSchema);

module.exports = Planning;