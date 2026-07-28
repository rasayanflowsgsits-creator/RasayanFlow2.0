const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const StudentRequest = require('../models/StudentRequest');
const LabHistory = require('../models/LabHistory');
const Inventory = require('../models/Inventory');
const StoreRequest = require('../models/StoreRequest');
const { getIo } = require('../sockets');

// @desc    Create a new student request
// @route   POST /api/student-requests
// @access  Private (Student)
const createRequest = asyncHandler(async (req, res) => {
  const { subject, experimentNo, experimentName, chemicalsRequested, labId, labName, year, semester } = req.body;

  // Prevent duplicate requests for the same experiment by the same student on the same day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRequest = await StudentRequest.findOne({
    studentId: req.user.id,
    experimentNo,
    subject,
    requestedAt: { $gte: today }
  });

  if (existingRequest) {
    res.status(400);
    throw new Error('You have already requested chemicals for this experiment today.');
  }

  const requestId = 'STU-REQ-' + Date.now();

  const newRequest = await StudentRequest.create({
    requestId,
    studentId: req.user.id,
    studentName: req.user.name,
    rollNumber: req.user.rollNumber,
    group: req.user.group,
    labId: labId || req.user.labId,
    labName: labName || req.user.labName,
    year: year || req.user.year,
    semester: semester || req.user.semester,
    subject,
    experimentNo,
    experimentName,
    chemicalsRequested: chemicalsRequested.map(c => ({ ...c, status: 'Pending' }))
  });

  // Notify Lab Admin (Assuming lab room room ID is labId)
  const io = getIo();
  if (io) {
    io.to(newRequest.labId.toString()).emit('new-student-request', newRequest);
  }

  res.status(201).json({ success: true, data: newRequest });
});

// @desc    Get requests for logged-in student
// @route   GET /api/student-requests/my
// @access  Private (Student)
const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await StudentRequest.find({ studentId: req.user.id }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Get all requests for a specific lab
// @route   GET /api/student-requests/lab
// @access  Private (Lab Admin)
const getLabRequests = asyncHandler(async (req, res) => {
  const labId = req.query.labId || req.user.labId;
  const requests = await StudentRequest.find({ labId }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Approve student request
// @route   PUT /api/student-requests/:id/approve
// @access  Private (Lab Admin)
const approveRequest = asyncHandler(async (req, res) => {
  const { approveType } = req.body; // 'available' or 'all_and_store'
  const studentRequest = await StudentRequest.findById(req.params.id);

  if (!studentRequest) {
    res.status(404);
    throw new Error('Request not found');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let allApproved = true;
    let anyApproved = false;
    const chemicalsUsed = [];

    for (let chemReq of studentRequest.chemicalsRequested) {
      // Find inventory
      const invItem = await Inventory.findOne({
        labId: studentRequest.labId,
        chemicalName: { $regex: new RegExp(`^${chemReq.chemicalName}$`, 'i') }
      }).session(session);

      if (invItem && invItem.quantity >= chemReq.quantityRequested) {
        // Sufficient stock
        invItem.quantity -= chemReq.quantityRequested;
        await invItem.save({ session });
        
        chemReq.status = 'Approved';
        anyApproved = true;

        chemicalsUsed.push({
          chemicalName: chemReq.chemicalName,
          quantityUsed: chemReq.quantityRequested,
          unit: chemReq.unit,
          costPerUnit: invItem.costPerUnit,
          totalCost: (invItem.costPerUnit || 0) * chemReq.quantityRequested
        });
      } else {
        // Low or no stock
        if (approveType === 'all_and_store') {
          // Auto create store request
          const qtyNeeded = chemReq.quantityRequested - (invItem ? invItem.quantity : 0);
          await StoreRequest.create([{
            labId: studentRequest.labId,
            chemicalName: chemReq.chemicalName,
            quantityRequested: qtyNeeded > 0 ? qtyNeeded : chemReq.quantityRequested, // request what is missing or more
            quantityUnit: chemReq.unit,
            status: 'Pending',
            requestedBy: req.user.id
          }], { session });

          // Still mark as approved (or pending store)? The requirement says:
          // "Auto create store request for low/out of stock chemicals. Mark all as Approved."
          // But physically they don't have it. We will deduct what we can, and go negative?
          // The spec says: "Reduce available chemicals. Auto create store request. Mark all as Approved."
          if (invItem) {
            invItem.quantity = 0; // deplete it entirely
            await invItem.save({ session });
          }

          chemReq.status = 'Approved';
          anyApproved = true;
          chemicalsUsed.push({
            chemicalName: chemReq.chemicalName,
            quantityUsed: chemReq.quantityRequested,
            unit: chemReq.unit,
            costPerUnit: invItem ? invItem.costPerUnit : 0,
            totalCost: (invItem ? invItem.costPerUnit : 0) * chemReq.quantityRequested
          });
        } else {
          chemReq.status = 'Pending';
          allApproved = false;
        }
      }
    }

    studentRequest.overallStatus = allApproved ? 'Approved' : (anyApproved ? 'Partial' : 'Pending');
    studentRequest.approvedAt = Date.now();
    studentRequest.approvedBy = req.user.id;
    
    await studentRequest.save({ session });

    if (anyApproved) {
      const totalCost = chemicalsUsed.reduce((acc, curr) => acc + curr.totalCost, 0);
      await LabHistory.create([{
        type: "Student Experiment",
        labId: studentRequest.labId,
        labName: studentRequest.labName,
        year: studentRequest.year,
        semester: studentRequest.semester,
        subject: studentRequest.subject,
        experimentNo: studentRequest.experimentNo,
        experimentName: studentRequest.experimentName,
        studentId: studentRequest.studentId,
        studentName: studentRequest.studentName,
        rollNumber: studentRequest.rollNumber,
        group: studentRequest.group,
        chemicalsUsed,
        totalCost,
        approvedBy: req.user.name,
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Notify student
    const io = getIo();
    if (io) {
      io.to(studentRequest.studentId.toString()).emit('notification', {
        title: 'Request Updated',
        message: `Your request for ${studentRequest.experimentName} has been ${studentRequest.overallStatus}.`
      });
    }

    res.status(200).json({ success: true, data: studentRequest });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error('Approval failed: ' + error.message);
  }
});

// @desc    Reject student request
// @route   PUT /api/student-requests/:id/reject
// @access  Private (Lab Admin)
const rejectRequest = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const studentRequest = await StudentRequest.findById(req.params.id);

  if (!studentRequest) {
    res.status(404);
    throw new Error('Request not found');
  }

  studentRequest.overallStatus = 'Rejected';
  studentRequest.rejectionReason = reason;
  studentRequest.rejectedAt = Date.now();
  studentRequest.chemicalsRequested.forEach(c => c.status = 'Rejected');

  await studentRequest.save();

  const io = getIo();
  if (io) {
    io.to(studentRequest.studentId.toString()).emit('notification', {
      title: 'Request Rejected',
      message: `Your request for ${studentRequest.experimentName} was rejected.`
    });
  }

  res.status(200).json({ success: true, data: studentRequest });
});

// @desc    Get history for student
// @route   GET /api/student-requests/history
// @access  Private (Student)
const getStudentHistory = asyncHandler(async (req, res) => {
  const history = await LabHistory.find({ studentId: req.user.id }).sort({ timestamp: -1 });
  res.status(200).json({ success: true, count: history.length, data: history });
});

// @desc    Get all lab history
// @route   GET /api/student-requests/lab-history
// @access  Private (Lab Admin)
const getLabHistory = asyncHandler(async (req, res) => {
  const labId = req.query.labId || req.user.labId;
  const history = await LabHistory.find({ labId }).sort({ timestamp: -1 });
  res.status(200).json({ success: true, count: history.length, data: history });
});

module.exports = {
  createRequest,
  getMyRequests,
  getLabRequests,
  approveRequest,
  rejectRequest,
  getStudentHistory,
  getLabHistory
};
