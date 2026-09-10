const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendOtpSms } = require('../utils/msg91Service');
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

const OTP_LENGTH = Number(process.env.MSG91_OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = Number(process.env.MSG91_OTP_EXPIRY_MINUTES) || 10;
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = (length = OTP_LENGTH) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign(
    { id, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (id, tokenVersion = 0) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  return jwt.sign(
    { id, tokenVersion },
    secret,
    { expiresIn: '7d' }
  );
};

const serializeUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  labId: user.labId,
  labName: user.labName,
  labCode: user.labCode || '',
  phoneNumber: user.phoneNumber || '',
  courseType: user.courseType || user.course || '',
  rollNumber: user.rollNumber || '',
  course: user.course || '',
  year: user.year || '',
  semester: user.semester || '',
  group: user.group || 'No Group',
  isApproved: user.isApproved,
  isBlocked: user.isBlocked,
  onboardingComplete: Boolean(
    user.onboardingComplete &&
    user.rollNumber &&
    user.year &&
    user.semester
  ) || Boolean(user.role && user.role !== 'student'),
});

const ensureConfiguredSuperAdmin = async (user) => {
  const isConfiguredSuperAdmin =
    Boolean(SUPER_ADMIN_EMAIL) && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;

  if (!isConfiguredSuperAdmin) {
    return user;
  }

  let shouldSave = false;

  if (user.role !== 'superAdmin') {
    user.role = 'superAdmin';
    shouldSave = true;
  }

  if (!user.isApproved) {
    user.isApproved = true;
    shouldSave = true;
  }

  if (user.labId) {
    user.labId = null;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, labId, labName, rollNumber, course, year, semester, group, phoneNumber } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Enforce one account per phone number (only when a phone number was provided).
  if (phoneNumber && String(phoneNumber).trim()) {
    const phoneExists = await User.findOne({ phoneNumber: String(phoneNumber).trim() });
    if (phoneExists) {
      res.status(400);
      throw new Error('An account with this phone number already exists');
    }
  }

  const isSuperAdmin = Boolean(SUPER_ADMIN_EMAIL) && email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const user = await User.create({
    name,
    email,
    password,
    displayPassword: password,
    phoneNumber: phoneNumber ? String(phoneNumber).trim() : '',
    role: isSuperAdmin ? 'superAdmin' : role || 'student',
    labId: labId || null,
    labName,
    rollNumber,
    course,
    year,
    semester,
    group,
    isApproved: isSuperAdmin || (role || 'student') === 'student',
  });

  await ActivityLog.create({
    userId: user._id,
    action: 'register',
    details: `Registration for ${user.email}`,
  });

  res.status(201).json({
    success: true,
    data: {
      ...serializeUser(user),
      accessToken: generateToken(user._id, user.tokenVersion),
      refreshToken: generateRefreshToken(user._id, user.tokenVersion),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    try {
      await ActivityLog.create({
        userId: user?._id || null,
        action: 'failed_login',
        details: `Failed login attempt for ${email}`,
        role: user?.role || 'unknown',
        userName: user?.name || 'Unknown User',
        userEmail: email,
        labName: user?.labName || '-',
        courseType: user?.course || '-',
        year: user?.year ? String(user.year) : '-',
        semester: user?.semester ? String(user.semester) : '-',
        status: 'Failed'
      });
    } catch (e) {
      // ignore log error
    }
    res.status(401);
    throw new Error('Invalid credentials');
  }

  await ensureConfiguredSuperAdmin(user);

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Account is blocked. Please contact an administrator.');
  }

  const requiresApproval = ['labAdmin', 'storeAdmin', 'store_admin'].includes(user.role);

  if (requiresApproval && (!SUPER_ADMIN_EMAIL || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) && !user.isApproved) {
    res.status(403);
    throw new Error('Account not approved yet');
  }

  let userLabName = user.labName || '-';
  let userLabCode = user.labCode || '-';
  let userYear = user.year ? String(user.year) : '-';
  let userSemester = user.semester ? String(user.semester) : '-';
  let userCourse = user.course || '-';
  let userCourseType = user.courseType || user.course || '-';

  if (user.labId) {
    try {
      const Lab = require('../models/Lab');
      const linkedLab = await Lab.findById(user.labId);
      if (linkedLab) {
        userLabName = linkedLab.labName || userLabName;
        userLabCode = linkedLab.labCode || userLabCode;
        if (!user.year || user.year === '-') userYear = linkedLab.year ? String(linkedLab.year) : '1';
        if (!user.semester || user.semester === '-') userSemester = linkedLab.semester ? String(linkedLab.semester) : '1';
        if (!user.course || user.course === '-') userCourse = linkedLab.courseType || 'B.Pharm';
        if (!user.courseType || user.courseType === '-') userCourseType = linkedLab.courseType || 'B.Pharm';

        user.labName = userLabName;
        user.labCode = userLabCode;
        user.year = userYear;
        user.semester = userSemester;
        user.course = userCourse;
        user.courseType = userCourseType;
        await user.save();
      }
    } catch (e) {
      // ignore lookup error
    }
  }

  try {
    await ActivityLog.create({
      userId: user._id,
      action: 'login',
      details: `User Logged In (${user.email})`,
      role: user.role,
      userName: user.name,
      userEmail: user.email,
      labName: user.role === 'storeAdmin' || user.role === 'store-admin' ? 'Central Store' : user.role === 'superAdmin' ? 'Governance Hub' : userLabName,
      courseType: userCourse !== '-' ? userCourse : (user.role === 'student' || user.role === 'labAdmin' ? 'B.Pharm' : '-'),
      year: userYear !== '-' ? userYear : (user.role === 'student' || user.role === 'labAdmin' ? '1' : '-'),
      semester: userSemester !== '-' ? userSemester : (user.role === 'student' || user.role === 'labAdmin' ? '1' : '-'),
      status: 'Success'
    });
  } catch (e) {
    // ignore log create error
  }

  res.json({
    success: true,
    data: {
      ...serializeUser(user),
      accessToken: generateToken(user._id, user.tokenVersion),
      refreshToken: generateRefreshToken(user._id, user.tokenVersion),    },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: serializeUser(user),
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const passwordMatches = await user.comparePassword(currentPassword);

  if (!passwordMatches) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;

  // Invalidate all previously issued JWT tokens
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  await ActivityLog.create({
    userId: user._id,
    action: 'change_password',
    details: `Password changed for ${user.email}`,
  });

  // Return fresh tokens because old tokens are now invalid
  const accessToken = generateToken(user._id, user.tokenVersion);
  const refreshToken = generateRefreshToken(user._id, user.tokenVersion);

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: {
      accessToken,
      refreshToken,
    },
  });
});

// Step 1: user submits their phone number -> we generate a 6-digit OTP,
// store only its hash + expiry on the user document, and send the OTP via
// MSG91 SMS.
const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  const normalizedPhone = String(phoneNumber).trim();

  const user = await User.findOne({ phoneNumber: normalizedPhone });

  console.log(
    `[password-reset] Looking up phone "${normalizedPhone}" -> ${
      user ? `FOUND (user: ${user.email})` : 'NOT FOUND in database'
    }`
  );

  // Always return the same response so users cannot discover whether a
  // phone number exists in the database.
  const genericResponse = {
    success: true,
    message: 'If an account with that phone number exists, an OTP has been sent.',
  };

  if (!user) {
    return res.json(genericResponse);
  }

  const otp = generateOtp();

  user.resetOtpHash = hashOtp(otp);
  user.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.resetOtpAttempts = 0;

  // Clear any previously issued (but unused) reset token from an earlier OTP.
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();

  await sendOtpSms({
    phoneNumber: normalizedPhone,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  });

  return res.json(genericResponse);
});

// Step 2: user submits the OTP they received -> on success we issue a
// short-lived, single-use reset token (same mechanism the old email flow
// used) that authorizes the actual password change in step 3.
const verifyResetOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    res.status(400);
    throw new Error('Phone number and OTP are required');
  }

  const normalizedPhone = String(phoneNumber).trim();

  const user = await User.findOne({ phoneNumber: normalizedPhone }).select(
    '+resetOtpHash +resetPasswordToken'
  );

  if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  if (user.resetOtpExpires.getTime() < Date.now()) {
    res.status(400);
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
    res.status(429);
    throw new Error('Too many incorrect attempts. Please request a new OTP.');
  }

  const isOtpValid = user.resetOtpHash === hashOtp(String(otp).trim());

  if (!isOtpValid) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
    await user.save();
    res.status(400);
    throw new Error('Incorrect OTP');
  }

  // OTP is correct and used exactly once — clear it immediately.
  user.resetOtpHash = null;
  user.resetOtpExpires = null;
  user.resetOtpAttempts = 0;

  // Issue a short-lived reset token for the final "set new password" step.
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const tokenExpiryMinutes =
    Number(process.env.RESET_PASSWORD_TOKEN_EXPIRY_MINUTES) || 10;

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);

  await user.save();

  res.json({
    success: true,
    message: 'OTP verified successfully.',
    data: { resetToken: rawToken },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400);
    throw new Error('Token and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken');

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired password reset token');
  }

  user.password = newPassword;

  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  await ActivityLog.create({
    userId: user._id,
    action: 'reset_password',
    details: `Password reset successfully for ${user.email}`,
  });

  res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new password.',
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400);
    throw new Error('refreshToken is required');
  }

  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, secret);
  } catch (err) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  await ensureConfiguredSuperAdmin(user);

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Account is blocked. Please contact an administrator.');
  }

  const requiresApproval = ['labAdmin', 'storeAdmin', 'store_admin'].includes(user.role);
  if (requiresApproval && (!SUPER_ADMIN_EMAIL || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) && !user.isApproved) {
    res.status(403);
    throw new Error('Account not approved yet');
  }

  // rotate tokens
const accessToken = generateToken(user._id, user.tokenVersion);
const newRefreshToken = generateRefreshToken(
  user._id,
  user.tokenVersion
);

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
});

const updateStudentOnboarding = asyncHandler(async (req, res) => {
  const { rollNumber, course, year, semester, group } = req.body;
  const userId = req.user?._id || req.user?.id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.rollNumber = rollNumber || user.rollNumber || `RN-${user._id.toString().slice(-6)}`;
  user.course = course || user.course || 'B.Pharm';
  user.year = year ? String(year) : (user.year || '1');
  user.semester = semester ? String(semester) : (user.semester || '1');
  if (group) user.group = group;
  user.onboardingComplete = true;

  await user.save();

  res.json({
    success: true,
    data: serializeUser(user),
  });
});

module.exports = {
  register,
  login,
  me,
  changePassword,
  refreshToken,
  updateStudentOnboarding,
  requestPasswordResetOtp,
  verifyResetOtp,
  resetPassword,
};