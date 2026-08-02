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

  await ActivityLog.create({ userId: req.user._id, action: 'create_lab', details: `Lab ${labName} (${labCode}) created — ${courseType || 'B.Pharm'} Year ${year || '?'} Sem ${semester || '?'}` });

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
      labName: lab.labName
    });
  }

  if (!admin) {
    res.status(404);
    throw new Error('Admin user not found');
  }

  admin.role = 'labAdmin';
  admin.labId = lab._id;
  admin.labName = lab.labName;
  admin.isApproved = true;
  if (name) admin.name = name;
  if (password) admin.password = password;
  await admin.save();

  if (!lab.admins.some((id) => id.toString() === admin._id.toString())) {
    lab.admins.push(admin._id);
    await lab.save();
  }

  const updatedLab = await Lab.findById(lab._id).populate('admins', 'name email role isApproved');

  await ActivityLog.create({ userId: req.user._id, action: 'assign_admin', details: `Assigned ${admin.email} as labAdmin to lab ${lab.labCode}` });

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

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const lab = await Lab.findById(labId).session(session);
      if (!lab) {
        res.status(404);
        throw new Error('Lab not found');
      }

      const linkedUsers = await User.find({ labId: lab._id }).session(session).select('_id');
      const linkedUserIds = linkedUsers.map((user) => user._id);
      const inventoryItemIds = await Inventory.find({ labId: lab._id }).session(session).distinct('_id');

      await Inventory.deleteMany({ labId: lab._id }).session(session);
      await Transaction.deleteMany({
        $or: [
          { labId: lab._id },
          { itemId: { $in: inventoryItemIds } },
        ],
      }).session(session);

      if (linkedUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: linkedUserIds } },
          [
            {
              $set: {
                labId: null,
                role: {
                  $cond: [{ $eq: ['$role', 'labAdmin'] }, 'student', '$role'],
                },
                isApproved: {
                  $cond: [{ $eq: ['$role', 'labAdmin'] }, false, '$isApproved'],
                },
              },
            },
          ],
          { session },
        );
      }

      await lab.deleteOne({ session });
      await ActivityLog.create([
        {
          userId: req.user._id,
          action: 'delete_lab',
          details: `Deleted lab ${lab.labName} (${lab.labCode})`,
        },
      ], { session });
    });
  } finally {
    session.endSession();
  }

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

    // 2. Year match (only filter out if lab explicitly specifies a different year)
    if (reqYr && lab.year && String(lab.year).trim() !== '') {
      const labYrNum = String(lab.year).replace(/\D/g, '');
      if (labYrNum && labYrNum !== reqYr) {
        return false;
      }
    }

    // 3. Semester match (only filter out if lab explicitly specifies a different semester)
    if (reqSem && lab.semester && String(lab.semester).trim() !== '') {
      const labSemNum = String(lab.semester).replace(/\D/g, '');
      if (labSemNum && labSemNum !== reqSem) {
        return false;
      }
    }

    return true;
  });

  // Fallback: If no exact year/semester match found, return all labs matching course (or all labs)
  if (matchingLabs.length === 0 && allLabs.length > 0) {
    const courseLabs = allLabs.filter((l) => {
      const c = (l.courseType || '').toLowerCase().trim();
      return c === reqCourse || c === 'b.pharm' || c === 'other' || !c;
    });
    matchingLabs = courseLabs.length > 0 ? courseLabs : allLabs;
  }

  res.json({ success: true, count: matchingLabs.length, data: matchingLabs });
});

module.exports = { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs };
