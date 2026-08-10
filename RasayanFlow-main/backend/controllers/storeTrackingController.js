const StoreTracking = require('../models/StoreTracking');
const asyncHandler = require('express-async-handler');

// @desc    Get all tracking logs
// @route   GET /api/store/tracking
// @access  Private (Store Admin, Super Admin)
const getTrackingLogs = asyncHandler(async (req, res) => {
  const logs = await StoreTracking.find({}).sort({ timestamp: -1 });
  res.status(200).json(logs);
});

module.exports = {
  getTrackingLogs
};
