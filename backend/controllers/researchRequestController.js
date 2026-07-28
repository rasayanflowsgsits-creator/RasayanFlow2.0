const asyncHandler = require('express-async-handler');
const StudentRequest = require('../models/StudentRequest');
const { getIo } = require('../sockets');

// @desc    Create a direct research request to store
// @route   POST /api/research-requests
// @access  Private (MPharm/PhD Student)
const createResearchRequest = asyncHandler(async (req, res) => {
  const { chemicalName, quantityRequested, unit, purpose } = req.body;

  if (!chemicalName || !quantityRequested || !unit) {
    res.status(400);
    throw new Error('Please provide chemical name, quantity, and unit');
  }

  const requestId = 'RES-REQ-' + Date.now();

  const newRequest = await StudentRequest.create({
    requestId,
    studentId: req.user.id,
    studentName: req.user.name,
    rollNumber: req.user.rollNumber,
    course: req.user.course,
    year: req.user.year,
    chemicalsRequested: [{
      chemicalName,
      quantityRequested,
      unit,
      status: 'Pending'
    }],
    subject: purpose, // Storing purpose in subject field for simplicity
    overallStatus: 'Pending'
  });

  // Notify Store Admins
  const io = getIo();
  if (io) {
    io.to('store-admin').emit('new-store-request', newRequest);
  }

  res.status(201).json({ success: true, data: newRequest });
});

// @desc    Get research requests for logged-in student
// @route   GET /api/research-requests/my
// @access  Private (Student)
const getMyResearchRequests = asyncHandler(async (req, res) => {
  // We identify research requests by checking if labId is null or if course is M.Pharm/PhD
  const requests = await StudentRequest.find({ studentId: req.user.id, labId: { $exists: false } }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

module.exports = {
  createResearchRequest,
  getMyResearchRequests
};
