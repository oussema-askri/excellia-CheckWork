const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'employee', 'zitouna'],
      message: 'Role must be either admin, employee or zitouna'
    },
    default: 'employee'
  },
  department: { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  
  trustedDeviceId: { type: String, default: null, select: false } 

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ department: 1 });

// Async hook WITHOUT next (Fixing the "next is not a function" error)
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = bcrypt.genSaltSync(12);
    this.password = bcrypt.hashSync(this.password, salt);
  } catch (error) {
    throw new Error(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.trustedDeviceId;
  delete obj.__v;
  return obj;
};

userSchema.virtual('displayName').get(function() { return this.name; });
userSchema.statics.findByEmail = function(email) { return this.findOne({ email: email.toLowerCase() }); };
userSchema.statics.findActiveEmployees = function() { return this.find({ isActive: true, role: 'employee' }); };

const User = mongoose.model('User', userSchema);
module.exports = User;