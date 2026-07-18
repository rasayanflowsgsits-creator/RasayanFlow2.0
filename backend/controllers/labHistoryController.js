const asyncHandler = require('express-async-handler');
const LabHistory = require('../models/LabHistory');
const StoreHistory = require('../models/StoreHistory');

// Get all history for a specific lab (Lab Admin view)
const getLabHistory = asyncHandler(async (req, res) => {
  const labId = req.user.labId;

  // We want to return both:
  // 1. Chemicals Received from Store (StoreHistory where labId matches)
  // 2. Chemicals Issued to Students (LabHistory where labId matches)
  
  const storeHistory = await StoreHistory.find({ labId }).sort({ timestamp: -1 });
  const labHistory = await LabHistory.find({ labId }).sort({ timestamp: -1 });
  
  res.status(200).json({
    receivedFromStore: storeHistory,
    issuedToStudents: labHistory
  });
});

// Get all lab history for a specific student (Student view)
const getStudentHistory = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user._id;
  const history = await LabHistory.find({ studentId }).sort({ timestamp: -1 });
  res.status(200).json(history);
});

module.exports = {
  getLabHistory,
  getStudentHistory
};
