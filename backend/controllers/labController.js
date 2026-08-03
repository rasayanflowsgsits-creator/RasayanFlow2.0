const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Lab = require('../models/Lab');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');

const createLab = asyncHandler(async (req, res) => {
  const { labName, labCode, courseType, department, year, semester } = req.body;

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

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_lab',
    details: `Lab ${labName} (${labCode}) created — ${courseType || 'B.Pharm'} Year ${year || '1'} Sem ${semester || '1'}`,
    role: req.user.role || 'superAdmin',
    userName: req.user.name || 'Super Administrator',
    userEmail: req.user.email,
    labName: labName,
    courseType: courseType || 'B.Pharm',
    year: year ? String(year) : '1',
    semester: semester ? String(semester) : '1',
    status: 'Success'
  });

  res.status(201).json({ success: true, data: lab });
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
  
  if (!admin && email) {
    admin = await User.findOne({ email: email.toLowerCase() });
  }

  if (!admin && email) {
    admin = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      password: password || '123456',
      role: 'labAdmin',
      isApproved: true,
      labId: lab._id,
      labName: lab.labName,
      course: lab.courseType || 'B.Pharm',
      courseType: lab.courseType || 'B.Pharm',
      year: lab.year || '1',
      semester: lab.semester || '1',
    });
  }

  if (!admin) {
    res.status(404);
    throw new Error('Admin user not found');
  }

  admin.role = 'labAdmin';
  admin.labId = lab._id;
  admin.labName = lab.labName;
  admin.course = lab.courseType || 'B.Pharm';
  admin.courseType = lab.courseType || 'B.Pharm';
  admin.year = lab.year || '1';
  admin.semester = lab.semester || '1';
  admin.isApproved = true;
  if (name) admin.name = name;
  if (password) admin.password = password;
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
  const allLabs = await Lab.find({}).populate('admins', 'name email role isApproved');

  if (!courseType && !year && !semester) {
    return res.json({ success: true, count: allLabs.length, data: allLabs });
  }

  const reqCourse = (courseType || 'B.Pharm').toLowerCase().trim();
  const reqYr = year ? String(year).replace(/\D/g, '') : '';
  const reqSem = semester ? String(semester).replace(/\D/g, '') : '';

  let matchingLabs = allLabs.filter((lab) => {
    // 1. Course type match
    const labCourse = (lab.courseType || 'B.Pharm').toLowerCase().trim();
    if (labCourse !== 'other' && labCourse !== reqCourse && !labCourse.includes(reqCourse) && !reqCourse.includes(labCourse)) {
      return false;
    }

    const labYr = lab.year ? String(lab.year).replace(/\D/g, '') : '';
    const labSem = lab.semester ? String(lab.semester).replace(/\D/g, '') : '';

    // If student specifies Year & Semester (e.g. Year 1 Sem 1):
    // Require exact Year & Semester match, OR explicit user assignment to this lab.
    if (reqYr && reqSem) {
      const isExactMatch = (labYr === reqYr && labSem === reqSem);
      const isUserAssigned = req.user?.labId && String(req.user.labId) === String(lab._id);
      return isExactMatch || isUserAssigned;
    }

    // 2. Fallback Year match
    if (reqYr && labYr && labYr !== reqYr) {
      return false;
    }

    // 3. Fallback Semester match
    if (reqSem && labSem && labSem !== reqSem) {
      return false;
    }

    return true;
  });

  // Return exact matching labs for this student's course, year, and semester
  res.json({ success: true, count: matchingLabs.length, data: matchingLabs });
});

module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs };
