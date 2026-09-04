const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superAdmin', 'labAdmin', 'storeAdmin', 'student', 'store_admin'],
    default: 'student',
  },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  labName: { type: String, trim: true },
  labCode: { type: String, trim: true },
  rollNumber: { type: String, trim: true },
  course: { type: String, trim: true },
  courseType: { type: String, trim: true },
  year: { type: String, trim: true },
  semester: { type: String, trim: true },
  group: { type: String, trim: true },
  isApproved: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String, trim: true, default: '' },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
 displayPassword: { type: String, trim: true, default: '' },

// Password reset fields
resetPasswordToken: {
  type: String,
  default: null,
  select: false,
},

resetPasswordExpires: {
  type: Date,
  default: null,
},

// Incremented whenever the password is changed/reset.
// Used to invalidate previously issued JWT tokens.
tokenVersion: {
  type: Number,
  default: 0,
},

onboardingComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
