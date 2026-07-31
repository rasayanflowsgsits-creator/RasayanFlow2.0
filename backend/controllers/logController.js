const asyncHandler = require('express-async-handler');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 200, userId, action, startDate, endDate } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(500, Math.max(1, Number(limit)));

  const filter = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (startDate) filter.timestamp = { ...(filter.timestamp || {}), $gte: new Date(startDate) };
  if (endDate) filter.timestamp = { ...(filter.timestamp || {}), $lte: new Date(endDate) };

  // Authorization: superAdmin can see all; labAdmin only logs for users in their lab
  const requester = req.user;
  if (requester.role === 'labAdmin') {
    const labUsers = await User.find({ labId: requester.labId }).select('_id');
    const ids = labUsers.map((u) => u._id);
    filter.userId = { $in: ids };
  }

  const total = await ActivityLog.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limitNum));

  const rawLogs = await ActivityLog.find(filter)
    .populate('userId', 'name email role labName course year semester')
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const formattedLogs = rawLogs.map((log) => {
    const u = log.userId || {};
    const roleRaw = log.role || u.role || 'student';
    let roleNorm = 'student';
    if (roleRaw.includes('super')) roleNorm = 'super-admin';
    else if (roleRaw.includes('store')) roleNorm = 'store-admin';
    else if (roleRaw.includes('lab')) roleNorm = 'lab-admin';
    else if (roleRaw.includes('student')) roleNorm = 'student';

    return {
      _id: log._id,
      id: log._id,
      timestamp: log.timestamp || log.createdAt,
      userName: log.userName || u.name || 'User',
      userEmail: log.userEmail || u.email || '',
      role: roleNorm,
      labName: log.labName || u.labName || (roleNorm === 'store-admin' ? 'Central Store' : roleNorm === 'super-admin' ? 'Governance Hub' : '-'),
      courseType: log.courseType || u.course || (roleNorm === 'student' || roleNorm === 'lab-admin' ? 'B.Pharm' : '-'),
      year: log.year !== '-' ? String(log.year) : (u.year ? String(u.year) : '-'),
      semester: log.semester !== '-' ? String(log.semester) : (u.semester ? String(u.semester) : '-'),
      actionDetails: log.details || log.action || 'User Action',
      status: log.status || (log.action === 'failed_login' ? 'Failed' : 'Success')
    };
  });

  res.json({ success: true, data: formattedLogs, logs: formattedLogs, pagination: { total, page: pageNum, limit: limitNum, pages } });
});

module.exports = { getLogs };
