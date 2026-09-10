const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNumber: {type: String, trim: true, default: '',},
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
// resetPasswordToken/resetPasswordExpires are issued only AFTER a phone OTP
// has been verified (see verifyResetOtp in authController). They act as a
// short-lived, single-use ticket that authorizes the final resetPassword call.
resetPasswordToken: {
  type: String,
  default: null,
  select: false,
},

resetPasswordExpires: {
  type: Date,
  default: null,
},

// Phone-based OTP password reset fields
resetOtpHash: {
  type: String,
  default: null,
  select: false,
},

resetOtpExpires: {
  type: Date,
  default: null,
},

// Number of failed OTP verification attempts for the current OTP.
// Used to lock an OTP after too many wrong guesses.
resetOtpAttempts: {
  type: Number,
  default: 0,
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

// Enforce one account per phone number — but only for non-empty numbers,
// since many existing/legacy users may still have phoneNumber: '' (blank),
// and a plain unique index would break on multiple blank values.
userSchema.index(
  { phoneNumber: 1 },
  { unique: true, partialFilterExpression: { phoneNumber: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.model('User', userSchema);