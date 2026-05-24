const asyncHandler = require('express-async-handler');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const filter = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (startDate) filter.timestamp = { ...(filter.timestamp || {}), $gte: new Date(startDate) };
  if (endDate) filter.timestamp = { ...(filter.timestamp || {}), $lte: new Date(endDate) };

  // Authorization: superAdmin can see all; labAdmin only logs for users in their lab
  const requester = req.user;
  if (requester.role === 'labAdmin') {
    // restrict to users who belong to this lab
    const labUsers = await User.find({ labId: requester.labId }).select('_id');
    const ids = labUsers.map((u) => u._id);
    filter.userId = { $in: ids };
  }

  const total = await ActivityLog.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limitNum));

  const logs = await ActivityLog.find(filter)
    .populate('userId', 'name email role labId')
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({ success: true, data: logs, pagination: { total, page: pageNum, limit: limitNum, pages } });
});

module.exports = { getLogs };
