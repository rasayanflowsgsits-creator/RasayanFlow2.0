const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  labId: user.labId,
  isApproved: user.isApproved,
  isBlocked: user.isBlocked,
  blockedReason: user.blockedReason || '',
  displayPassword: user.displayPassword || '',
});

const getUsers = asyncHandler(async (req, res) => {
  const { role, labId, page = 1, limit = 1000 } = req.query;
  const filter = {};

  if (req.user.role === 'labAdmin') {
    filter.role = 'student';
    if (req.user.labId) filter.labId = req.user.labId;
  } else if (req.user.role === 'storeAdmin') {
    filter.role = 'student';
    if (labId) filter.labId = labId;
  } else {
    if (role) filter.role = role;
    if (labId) filter.labId = labId;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .populate('labId', 'labName labCode courseType year semester department')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: users, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const approveUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isApproved = true;
  await user.save();

  await ActivityLog.create({ userId: req.user._id, action: 'approve_user', details: `Approved ${user.email}` });

  res.json({ success: true, data: user });
});

const setUserBlockedState = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isBlocked, blockedReason = '' } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'student') {
    res.status(400);
    throw new Error('Only student accounts can be blocked or unblocked');
  }

  if (req.user.role === 'labAdmin' && String(user.labId || '') !== String(req.user.labId || '')) {
    res.status(403);
    throw new Error('Lab admins can only block students in their assigned lab');
  }

  user.isBlocked = Boolean(isBlocked);
  user.blockedReason = user.isBlocked ? blockedReason.trim() : '';
  user.blockedBy = user.isBlocked ? req.user._id : null;
  await user.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: user.isBlocked ? 'block_user' : 'unblock_user',
    details: `${user.isBlocked ? 'Blocked' : 'Unblocked'} ${user.email}`,
    entityType: 'user',
    entityId: user._id,
    metadata: { blockedReason: user.blockedReason },
  });

  res.json({ success: true, data: user });
});

const createSuperAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  const normalizedEmail = email.toLowerCase();
  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    displayPassword: password,
    role: 'superAdmin',
    isApproved: true,
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_super_admin',
    details: `Created super admin ${user.email}`,
    entityType: 'user',
    entityId: user._id,
    metadata: { role: user.role },
  });

  res.status(201).json({ success: true, data: serializeUser(user) });
});

const createLabAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.role = 'labAdmin';
    user.isApproved = true;
    if (name) user.name = name;
    if (password) {
      user.password = password;
      user.displayPassword = password;
    }
    await user.save();
    await ActivityLog.create({
      userId: req.user._id,
      action: 'update_lab_admin',
      details: `Updated lab admin role & credentials for ${user.email}`,
    });
    return res.status(200).json({ success: true, data: serializeUser(user) });
  }

  user = await User.create({
    name,
    email: normalizedEmail,
    password,
    displayPassword: password,
    role: 'labAdmin',
    isApproved: true,
  });
  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_lab_admin',
    details: `Created lab admin ${user.email}`,
  });
  res.status(201).json({ success: true, data: serializeUser(user) });
});

const createStoreAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }
  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    displayPassword: password,
    role: 'storeAdmin',
    isApproved: true,
  });
  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_store_admin',
    details: `Created store admin ${user.email}`,
  });
  res.status(201).json({ success: true, data: serializeUser(user) });
});

const resetUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    res.status(400);
    throw new Error('Password must be at least 4 characters');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User account not found');
  }

  user.password = newPassword;
  user.displayPassword = newPassword;
  await user.save();

  await ActivityLog.create({
    userId: req.user._id,
    action: 'reset_user_password',
    details: `Super Admin reset password for ${user.email} (${user.role})`,
  });

  res.json({ success: true, message: `Password reset successfully for ${user.name}` });
});

module.exports = { getUsers, approveUser, setUserBlockedState, createSuperAdmin, createLabAdmin, createStoreAdmin, resetUserPassword };
