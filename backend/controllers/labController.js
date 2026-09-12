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

  const isPhDLab = courseType === 'PhD' || courseType === 'PhD Research';
  const effectiveYear = isPhDLab ? '' : (year || '');
  const effectiveSemester = isPhDLab ? '' : (semester || '');

  const lab = await Lab.create({
    labName,
    labCode,
    courseType: isPhDLab ? 'PhD' : (courseType || 'B.Pharm'),
    department: department || '',
    year: effectiveYear,
    semester: effectiveSemester,
    createdBy: req.user._id,
    admins: [],
  });

  // — Atomic admin provisioning —
  let provisionedAdmin = null;

  // 1. If explicit existingAdminId passed
  if (adminMode === 'existing' && existingAdminId) {
    const existingAdmin = await User.findById(existingAdminId);
    if (existingAdmin) {
      existingAdmin.role = isPhDLab ? 'student' : 'labAdmin';
      existingAdmin.labId = lab._id;
      existingAdmin.labName = lab.labName;
      existingAdmin.labCode = lab.labCode;
      existingAdmin.course = isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm');
      existingAdmin.courseType = isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm');
      existingAdmin.year = effectiveYear;
      existingAdmin.semester = effectiveSemester;
      existingAdmin.isApproved = true;
      existingAdmin.isPhD = isPhDLab;
      if (adminName && adminName.trim()) existingAdmin.name = adminName.trim();
      if (adminPassword && adminPassword.trim()) {
        existingAdmin.password = adminPassword.trim();
        existingAdmin.displayPassword = adminPassword.trim();
      }
      await existingAdmin.save();
      provisionedAdmin = existingAdmin;
    }
  }

  // 2. If adminEmail is provided
  if (!provisionedAdmin && adminEmail && adminEmail.trim()) {
    const normalizedEmail = adminEmail.toLowerCase().trim();

    let existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // User exists -> Assign to this lab
      existingUser.role = isPhDLab ? 'student' : 'labAdmin';
      existingUser.labId = lab._id;
      existingUser.labName = lab.labName;
      existingUser.labCode = lab.labCode;
      existingUser.course = isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm');
      existingUser.courseType = isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm');
      existingUser.year = effectiveYear;
      existingUser.semester = effectiveSemester;
      existingUser.isApproved = true;
      existingUser.isPhD = isPhDLab;
      if (adminName && adminName.trim()) existingUser.name = adminName.trim();
      if (adminPassword && adminPassword.trim()) {
        existingUser.password = adminPassword.trim();
        existingUser.displayPassword = adminPassword.trim();
      }
      await existingUser.save();
      provisionedAdmin = existingUser;
    } else {
      // User does not exist -> Create new user
      const defaultPass = (adminPassword && adminPassword.trim()) || '123456';
      provisionedAdmin = await User.create({
        name: (adminName && adminName.trim()) || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: defaultPass,
        displayPassword: defaultPass,
        role: isPhDLab ? 'student' : 'labAdmin',
        isApproved: true,
        isPhD: isPhDLab,
        labId: lab._id,
        labName: lab.labName,
        labCode: lab.labCode,
        course: isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm'),
        courseType: isPhDLab ? 'PhD' : (lab.courseType || 'B.Pharm'),
        year: effectiveYear,
        semester: effectiveSemester,
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
  const allLabAdmins = await User.find({
    $or: [{ role: { $in: ['labAdmin', 'lab-admin'] } }, { isPhD: true }, { course: 'PhD' }, { labId: { $ne: null } }]
  }).select('_id name email role isPhD course labId labName labCode');

  const enrichedLabs = await Promise.all(
    labs.map(async (labDoc) => {
      const labObj = labDoc.toObject();
      const currentAdmins = Array.isArray(labObj.admins) ? labObj.admins : [];

      const matchedAdmins = allLabAdmins.filter(
        (u) => u.labId && String(u.labId) === String(labDoc._id)
      );

      let needsSave = false;
      matchedAdmins.forEach((u) => {
        const alreadyInAdmins = currentAdmins.some((a) => String(a._id || a) === String(u._id));
        if (!alreadyInAdmins) {
          currentAdmins.push({ _id: u._id, name: u.name, email: u.email, role: u.role, isApproved: true });
          if (!labDoc.admins.some((id) => String(id) === String(u._id))) {
            labDoc.admins.push(u._id);
            needsSave = true;
          }
        }
      });

      if (needsSave) {
        await labDoc.save();
      }

      return {
        ...labObj,
        admins: currentAdmins,
      };
    })
  );

  res.json({ success: true, data: enrichedLabs });
});

const assignAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId, email, name, password } = req.body;

  if (!labId) {
    res.status(400);
    throw new Error('Lab ID is required');
  }

  let lab = null;
  if (mongoose.Types.ObjectId.isValid(labId)) {
    lab = await Lab.findById(labId);
  }
  if (!lab) {
    lab = await Lab.findOne({ $or: [{ labCode: String(labId) }, { labName: String(labId) }] });
  }
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  if (!Array.isArray(lab.admins)) {
    lab.admins = [];
  }

  let admin = null;
  if (adminId) {
    admin = await User.findById(adminId);
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  if (!admin && normalizedEmail) {
    admin = await User.findOne({ email: normalizedEmail });
  }

  const isPhD = lab.courseType === 'PhD' || lab.courseType === 'PhD Research';
  const roleToSet = isPhD ? 'student' : 'labAdmin';
  const yearToSet = isPhD ? '' : (lab.year || '1');
  const semToSet = isPhD ? '' : (lab.semester || '1');

  let isNewUser = false;
  if (!admin && normalizedEmail) {
    const defaultPass = (password && password.trim()) || '123456';
    admin = await User.create({
      name: (name && name.trim()) || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password: defaultPass,
      displayPassword: defaultPass,
      role: roleToSet,
      isApproved: true,
      isPhD: isPhD,
      labId: lab._id,
      labName: lab.labName,
      labCode: lab.labCode,
      course: isPhD ? 'PhD' : (lab.courseType || 'B.Pharm'),
      courseType: isPhD ? 'PhD' : (lab.courseType || 'B.Pharm'),
      year: yearToSet,
      semester: semToSet,
    });
    isNewUser = true;
  }

  if (!admin) {
    res.status(404);
    throw new Error('Admin user not found or valid email not provided');
  }

  if (!isNewUser) {
    admin.role = roleToSet;
    admin.labId = lab._id;
    admin.labName = lab.labName;
    admin.labCode = lab.labCode;
    admin.course = isPhD ? 'PhD' : (lab.courseType || 'B.Pharm');
    admin.courseType = isPhD ? 'PhD' : (lab.courseType || 'B.Pharm');
    admin.year = yearToSet;
    admin.semester = semToSet;
    admin.isApproved = true;
    admin.isPhD = isPhD;
    if (name && name.trim()) admin.name = name.trim();
    if (password && password.trim()) {
      admin.password = password.trim();
      admin.displayPassword = password.trim();
    }
    await admin.save();
  }

  const adminIdStr = admin._id.toString();
  if (!lab.admins.some((id) => id && id.toString() === adminIdStr)) {
    lab.admins.push(admin._id);
  }
  lab.admin = admin.name || admin.email;
  lab.adminEmail = admin.email;
  await lab.save();

  const updatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');

  try {
    await ActivityLog.create({
      userId: req.user ? req.user._id : admin._id,
      action: 'assign_admin',
      details: `Assigned ${admin.email} as labAdmin to lab ${lab.labCode} (${lab.labName})`,
      role: (req.user && req.user.role) || 'superAdmin',
      userName: (req.user && req.user.name) || 'Super Administrator',
      userEmail: req.user ? req.user.email : 'admin@rasayanflow.edu',
      labName: lab.labName,
      courseType: lab.courseType || 'B.Pharm',
      year: admin.year,
      semester: admin.semester,
      status: 'Success'
    });
  } catch (logErr) {
    console.error('Activity log error:', logErr);
  }

  res.json({ success: true, data: updatedLab });
});

const removeAdmin = asyncHandler(async (req, res) => {
  const { labId, adminId } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  if (!Array.isArray(lab.admins)) {
    lab.admins = [];
  }

  lab.admins = lab.admins.filter((id) => id && id.toString() !== String(adminId));
  await lab.save();

  const admin = await User.findById(adminId);
  if (admin) {
    admin.role = 'student';
    admin.labId = null;
    admin.labName = '';
    admin.labCode = '';
    admin.isApproved = false;
    await admin.save();
  }

  try {
    await ActivityLog.create({
      userId: req.user ? req.user._id : lab._id,
      action: 'remove_admin',
      details: `Removed ${admin?.email || adminId} from lab ${lab.labCode}`
    });
  } catch (logErr) {
    console.error('Activity log error:', logErr);
  }

  const updatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');
  res.json({ success: true, data: updatedLab });
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
  const isPhD = reqCourse === 'phd' || reqCourse === 'phd research' || req.user?.isPhD || req.user?.course === 'PhD';

  const matchingLabs = allLabs.filter((lab) => {
    // For PhD scholars, match PhD labs or user's assigned lab
    if (isPhD) {
      const labCourse = (lab.courseType || '').toLowerCase().trim();
      const matchesLabId = req.user?.labId && String(lab._id) === String(req.user.labId);
      return labCourse === 'phd' || labCourse === 'phd research' || matchesLabId;
    }

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

const updateLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { labName, labCode, courseType, department, year, semester } = req.body;

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  // Check code collision if code changed
  if (labCode && labCode.toUpperCase() !== lab.labCode) {
    const codeExists = await Lab.findOne({ labCode: labCode.toUpperCase(), _id: { $ne: lab._id } });
    if (codeExists) {
      res.status(400);
      throw new Error('labCode already in use by another lab');
    }
    lab.labCode = labCode.toUpperCase();
  }

  if (labName) lab.labName = labName.trim();
  if (courseType) lab.courseType = courseType.trim();
  if (department !== undefined) lab.department = department.trim();

  const isPhD = (courseType && (courseType === 'PhD' || courseType === 'PhD Research')) || lab.courseType === 'PhD' || lab.courseType === 'PhD Research';
  if (isPhD) {
    lab.year = '';
    lab.semester = '';
    lab.courseType = 'PhD';
  } else {
    if (year !== undefined) lab.year = String(year).trim();
    if (semester !== undefined) lab.semester = String(semester).trim();
  }

  await lab.save();

  // Sync details across assigned lab admin users if labName or labCode or course/year/sem updated
  await User.updateMany(
    { labId: lab._id },
    {
      $set: {
        labName: lab.labName,
        labCode: lab.labCode,
        course: lab.courseType,
        courseType: lab.courseType,
        year: isPhD ? '' : lab.year,
        semester: isPhD ? '' : lab.semester,
        ...(isPhD ? { isPhD: true, role: 'student' } : {})
      }
    }
  );

  await ActivityLog.create({
    userId: req.user._id,
    action: 'update_lab',
    details: `Updated lab details: ${lab.labName} (${lab.labCode}) — ${lab.courseType}${isPhD ? ' (PhD Research)' : ` Yr ${lab.year} Sem ${lab.semester}`}`
  });

  const updatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');
  res.json({ success: true, data: updatedLab });
});

module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs, updateLab };

