const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

const serializeUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  labId: user.labId,
  labName: user.labName,
  rollNumber: user.rollNumber || '',
  course: user.course || (user.onboardingComplete ? 'B.Pharm' : ''),
  year: user.year || (user.onboardingComplete ? '1' : ''),
  semester: user.semester || (user.onboardingComplete ? '1' : ''),
  group: user.group || 'No Group',
  isApproved: user.isApproved,
  isBlocked: user.isBlocked,
  onboardingComplete: Boolean(user.onboardingComplete || user.rollNumber || (user.role && user.role !== 'student')),
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
  const { name, email, password, role, labId, labName, rollNumber, course, year, semester, group } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const isSuperAdmin = Boolean(SUPER_ADMIN_EMAIL) && email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const user = await User.create({
    name,
    email,
    password,
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
      accessToken: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
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
  let userYear = user.year ? String(user.year) : '-';
  let userSemester = user.semester ? String(user.semester) : '-';
  let userCourse = user.course || '-';

  if (user.labId) {
    try {
      const Lab = require('../models/Lab');
      const linkedLab = await Lab.findById(user.labId);
      if (linkedLab) {
        userLabName = linkedLab.labName || userLabName;
        if (!user.year || user.year === '-') userYear = linkedLab.year ? String(linkedLab.year) : '1';
        if (!user.semester || user.semester === '-') userSemester = linkedLab.semester ? String(linkedLab.semester) : '1';
        if (!user.course || user.course === '-') userCourse = linkedLab.courseType || 'B.Pharm';

        user.labName = userLabName;
        user.year = userYear;
        user.semester = userSemester;
        user.course = userCourse;
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
      accessToken: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    },
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
  await user.save();

  await ActivityLog.create({
    userId: user._id,
    action: 'change_password',
    details: `Password changed for ${user.email}`,
  });

  res.json({ success: true, message: 'Password updated successfully' });
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
  const accessToken = generateToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

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

module.exports = { register, login, me, changePassword, refreshToken, updateStudentOnboarding };
