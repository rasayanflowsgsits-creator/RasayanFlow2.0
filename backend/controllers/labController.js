const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Lab = require('../models/Lab');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');

const createLab = asyncHandler(async (req, res) => {
  const {
    labName, labCode, courseType, department, year, semester,
    // Optional admin provisioning in one shot
    adminMode,
    adminEmail, adminName, adminPassword,
    existingAdminId,
  } = req.body;

  if (!labName || !labCode) {
    res.status(400);
    throw new Error('labName and labCode are required');
  }

  const existing = await Lab.findOne({ labCode });
  if (existing) {
    res.status(400);
    throw new Error('labCode already exists');
  }

  const lab = await Lab.create({
    labName,
    labCode,
    courseType: courseType || 'B.Pharm',
    department: department || '',
    year: year || '',
    semester: semester || '',
    createdBy: req.user._id,
    admins: [],
  });

  // — Atomic admin provisioning —
  let provisionedAdmin = null;

  // 1. If explicit existingAdminId passed
  if (adminMode === 'existing' && existingAdminId) {
    const existingAdmin = await User.findById(existingAdminId);
    if (existingAdmin) {
      existingAdmin.role = 'labAdmin';
      existingAdmin.labId = lab._id;
      existingAdmin.labName = lab.labName;
      existingAdmin.labCode = lab.labCode;
      existingAdmin.course = lab.courseType || 'B.Pharm';
      existingAdmin.courseType = lab.courseType || 'B.Pharm';
      existingAdmin.year = lab.year || '1';
      existingAdmin.semester = lab.semester || '1';
      existingAdmin.isApproved = true;
      if (adminName && adminName.trim()) existingAdmin.name = adminName.trim();
      if (adminPassword && adminPassword.trim()) existingAdmin.password = adminPassword.trim();
      await existingAdmin.save();
      provisionedAdmin = existingAdmin;
    }
  }

  // 2. If adminEmail is provided
  if (!provisionedAdmin && adminEmail && adminEmail.trim()) {
    const normalizedEmail = adminEmail.toLowerCase().trim();

    let existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // User exists -> Upgrade to labAdmin & assign to this lab
      existingUser.role = 'labAdmin';
      existingUser.labId = lab._id;
      existingUser.labName = lab.labName;
      existingUser.labCode = lab.labCode;
      existingUser.course = lab.courseType || 'B.Pharm';
      existingUser.courseType = lab.courseType || 'B.Pharm';
      existingUser.year = lab.year || '1';
      existingUser.semester = lab.semester || '1';
      existingUser.isApproved = true;
      if (adminName && adminName.trim()) existingUser.name = adminName.trim();
      if (adminPassword && adminPassword.trim()) existingUser.password = adminPassword.trim();
      await existingUser.save();
      provisionedAdmin = existingUser;
    } else {
      // User does not exist -> Create new labAdmin user
      provisionedAdmin = await User.create({
        name: (adminName && adminName.trim()) || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: (adminPassword && adminPassword.trim()) || '123456',
        role: 'labAdmin',
        isApproved: true,
        labId: lab._id,
        labName: lab.labName,
        labCode: lab.labCode,
        course: lab.courseType || 'B.Pharm',
        courseType: lab.courseType || 'B.Pharm',
        year: lab.year || '1',
        semester: lab.semester || '1',
      });
    }
  }

  // Link admin to lab admins array
  if (provisionedAdmin && !lab.admins.some((id) => id.toString() === provisionedAdmin._id.toString())) {
    lab.admins.push(provisionedAdmin._id);
    await lab.save();
  }

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_lab',
    details: `Lab ${labName} (${labCode}) created — ${courseType || 'B.Pharm'} Year ${year || '1'} Sem ${semester || '1'}${provisionedAdmin ? ` — Admin: ${provisionedAdmin.email}` : ''}`,
    role: req.user.role || 'superAdmin',
    userName: req.user.name || 'Super Administrator',
    userEmail: req.user.email,
    labName: labName,
    courseType: courseType || 'B.Pharm',
    year: year ? String(year) : '1',
    semester: semester ? String(semester) : '1',
    status: 'Success'
  });

  const populatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');
  res.status(201).json({ success: true, data: populatedLab });
});

const listLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().populate('admins', 'name email role isApproved');
  res.json({ success: true, data: labs });
});

const assignAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId, email, name, password } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  let admin = null;
  if (adminId) {
    admin = await User.findById(adminId);
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  if (!admin && normalizedEmail) {
    admin = await User.findOne({ email: normalizedEmail });
  }

  if (!admin && normalizedEmail) {
    admin = await User.create({
      name: (name && name.trim()) || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password: (password && password.trim()) || '123456',
      role: 'labAdmin',
      isApproved: true,
      labId: lab._id,
      labName: lab.labName,
      labCode: lab.labCode,
      course: lab.courseType || 'B.Pharm',
      courseType: lab.courseType || 'B.Pharm',
      year: lab.year || '1',
      semester: lab.semester || '1',
    });
  }

  if (!admin) {
    res.status(404);
    throw new Error('Admin user not found or valid email not provided');
  }

  admin.role = 'labAdmin';
  admin.labId = lab._id;
  admin.labName = lab.labName;
  admin.labCode = lab.labCode;
  admin.course = lab.courseType || 'B.Pharm';
  admin.courseType = lab.courseType || 'B.Pharm';
  admin.year = lab.year || '1';
  admin.semester = lab.semester || '1';
  admin.isApproved = true;
  if (name && name.trim()) admin.name = name.trim();
  if (password && password.trim()) admin.password = password.trim();
  await admin.save();

  if (!lab.admins.some((id) => id.toString() === admin._id.toString())) {
    lab.admins.push(admin._id);
    await lab.save();
  }

  const updatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');

  await ActivityLog.create({
    userId: req.user._id,
    action: 'assign_admin',
    details: `Assigned ${admin.email} as labAdmin to lab ${lab.labCode} (${lab.labName})`,
    role: req.user.role || 'superAdmin',
    userName: req.user.name || 'Super Administrator',
    userEmail: req.user.email,
    labName: lab.labName,
    courseType: lab.courseType || 'B.Pharm',
    year: admin.year,
    semester: admin.semester,
    status: 'Success'
  });

  res.json({ success: true, data: updatedLab });
});

const removeAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  lab.admins = lab.admins.filter((id) => id.toString() !== adminId);
  await lab.save();

  const admin = await User.findById(adminId);
  if (admin) {
    admin.role = 'student';
    admin.labId = null;
    admin.isApproved = false;
    await admin.save();
  }

  await ActivityLog.create({ userId: req.user._id, action: 'remove_admin', details: `Removed ${admin?.email || adminId} from lab ${lab.labCode}` });

  res.json({ success: true, data: lab });
});

const approveAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  const admin = await User.findById(adminId);
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  admin.isApproved = true;
  await admin.save();

  await ActivityLog.create({ userId: req.user._id, action: 'approve_admin', details: `Approved admin ${admin.email}` });

  res.json({ success: true, data: admin });
});

const deleteLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  const LabStructure = require('../models/LabStructure');
  const Experiment = require('../models/Experiment');

  const linkedUsers = await User.find({ labId: lab._id }).select('_id');
  const linkedUserIds = linkedUsers.map((u) => u._id);
  const inventoryItemIds = await Inventory.find({ labId: lab._id }).distinct('_id');

  await Inventory.deleteMany({ labId: lab._id });
  await Transaction.deleteMany({
    $or: [{ labId: lab._id }, { itemId: { $in: inventoryItemIds } }],
  });
  await LabStructure.deleteMany({ labId: lab._id });
  await Experiment.deleteMany({ labId: lab._id });

  if (linkedUserIds.length > 0) {
    await User.updateMany(
      { _id: { $in: linkedUserIds } },
      { $set: { labId: null, role: 'student', isApproved: false } }
    );
  }

  await lab.deleteOne();
  await ActivityLog.create({
    userId: req.user._id,
    action: 'delete_lab',
    details: `Deleted lab ${lab.labName} (${lab.labCode})`
  });

  res.json({ success: true, message: 'Lab deleted successfully' });
});

const getMatchingLabs = asyncHandler(async (req, res) => {
  const { courseType, year, semester } = req.query;

  // All three filters are required for student lab queries
  // If none provided, return empty — never leak all labs to students
  if (!courseType && !year && !semester) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const allLabs = await Lab.find({}).populate('admins', 'name email role isApproved');

  const reqCourse = (courseType || '').toLowerCase().trim();
  const reqYr = year ? String(year).replace(/\D/g, '') : '';
  const reqSem = semester ? String(semester).replace(/\D/g, '') : '';

  const matchingLabs = allLabs.filter((lab) => {
    // 1. Course type must match exactly
    const labCourse = (lab.courseType || 'B.Pharm').toLowerCase().trim();
    if (reqCourse) {
      if (labCourse !== reqCourse && !labCourse.includes(reqCourse) && !reqCourse.includes(labCourse)) {
        return false;
      }
    }

    // 2. Year must match exactly (both must be present and equal)
    const labYr = lab.year ? String(lab.year).replace(/\D/g, '') : '';
    if (reqYr && labYr && labYr !== reqYr) return false;
    if (reqYr && !labYr) return false; // lab has no year set — exclude

    // 3. Semester must match exactly (both must be present and equal)
    const labSem = lab.semester ? String(lab.semester).replace(/\D/g, '') : '';
    if (reqSem && labSem && labSem !== reqSem) return false;
    if (reqSem && !labSem) return false; // lab has no semester set — exclude

    return true;
  });

  res.json({ success: true, count: matchingLabs.length, data: matchingLabs });
});


module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs };
