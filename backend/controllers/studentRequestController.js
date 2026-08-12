const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const StudentRequest = require('../models/StudentRequest');
const Inventory = require('../models/Inventory');
const LabHistory = require('../models/LabHistory');
let getIo = () => null;
try {
  const socketModule = require('../socket');
  if (socketModule && socketModule.getIo) getIo = socketModule.getIo;
} catch (e) {
  // Socket module optional
}

const crypto = require('crypto');
let uuidv4;
try {
  uuidv4 = require('uuid').v4;
} catch (e) {
  uuidv4 = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
}

// @desc    Create a new student request for chemicals
// @route   POST /api/student/requests
// @access  Private (Student)
const createRequest = asyncHandler(async (req, res) => {
  const { labId, labName, year, semester, subject, experimentNo, experimentName, chemicalsRequested, notes } = req.body;

  if (!experimentName || !chemicalsRequested || chemicalsRequested.length === 0) {
    res.status(400);
    throw new Error('Experiment name and chemicals are required');
  }

  const rawLabId = labId || req.user.labId;
  let targetLabId = null;
  if (rawLabId && mongoose.Types.ObjectId.isValid(rawLabId)) {
    targetLabId = new mongoose.Types.ObjectId(rawLabId);
  } else if (rawLabId) {
    const foundLab = await mongoose.model('Lab').findOne({ $or: [{ labCode: rawLabId }, { name: rawLabId }, { labName: rawLabId }] });
    if (foundLab) {
      targetLabId = new mongoose.Types.ObjectId(foundLab._id);
    }
  }

  // Duplicate Check: Check if student already requested this experiment and status is STILL Pending
  const existingPending = await StudentRequest.findOne({
    studentId: req.user.id,
    labId: targetLabId,
    experimentName: experimentName,
    overallStatus: 'Pending'
  });

  if (existingPending && !req.body.forceSubmit) {
    const formattedDate = new Date(existingPending.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return res.status(409).json({
      success: false,
      message: `You already have a pending request for this experiment!\nRequest ID: ${existingPending.requestId}\nSubmitted: ${formattedDate}`,
      isDuplicate: true,
      data: existingPending
    });
  }

  const requestId = `STU-REQ-${uuidv4().slice(0, 8).toUpperCase()}`;

  const newRequest = await StudentRequest.create({
    requestId,
    studentId: req.user.id,
    studentName: req.user.name,
    rollNumber: req.user.rollNumber || 'RN-1001',
    group: req.user.group || 'Group A',
    ...(targetLabId && { labId: targetLabId }),
    labName: labName || 'HAP1',
    year: year || req.user.year || '1',
    semester: semester || req.user.semester || '1',
    subject: subject || 'HAP - I',
    experimentNo: Number(experimentNo) || 1,
    experimentName: experimentName,
    chemicalsRequested: chemicalsRequested.map(c => ({
      chemicalName: c.chemicalName || c.name,
      quantityRequested: Number(c.quantityRequested || c.quantity || c.quantityPerStudent || 1),
      unit: c.unit || c.quantityUnit || 'mL',
      status: 'Pending'
    })),
    rejectionReason: notes || ''
  });

  const io = getIo();
  if (io && newRequest.labId) {
    io.to(newRequest.labId.toString()).emit('new-student-request', newRequest);
  }

  res.status(201).json({ success: true, data: newRequest });
});

// @desc    Get requests for logged-in student
// @route   GET /api/student/requests/my
// @access  Private (Student)
const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await StudentRequest.find({ studentId: req.user.id }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Get student requests for a specific labId
// @route   GET /api/student/requests/lab/:labId
// @access  Private (Student)
const getStudentRequestsForLab = asyncHandler(async (req, res) => {
  const rawLabId = req.params.labId || req.query.labId || req.user.labId;
  const queryIds = [];
  if (rawLabId && mongoose.Types.ObjectId.isValid(rawLabId)) {
    queryIds.push(new mongoose.Types.ObjectId(rawLabId));
  } else if (rawLabId) {
    const lab = await mongoose.model('Lab').findOne({ $or: [{ labCode: rawLabId }, { name: rawLabId }, { labName: rawLabId }] });
    if (lab) queryIds.push(new mongoose.Types.ObjectId(lab._id));
  }
  if (queryIds.length === 0) queryIds.push(new mongoose.Types.ObjectId()); // prevent empty $in crash or unintended match

  const requests = await StudentRequest.find({
    studentId: req.user.id,
    labId: { $in: queryIds }
  }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Get all requests for a specific lab (Lab Admin)
// @route   GET /api/student/requests/lab
// @access  Private (Lab Admin)
const getLabRequests = asyncHandler(async (req, res) => {
  const rawLabId = req.query.labId || req.user.labId;
  const queryIds = [];
  if (rawLabId && mongoose.Types.ObjectId.isValid(rawLabId)) {
    queryIds.push(new mongoose.Types.ObjectId(rawLabId));
  } else if (rawLabId) {
    const lab = await mongoose.model('Lab').findOne({ $or: [{ labCode: rawLabId }, { name: rawLabId }, { labName: rawLabId }] });
    if (lab) queryIds.push(new mongoose.Types.ObjectId(lab._id));
  }
  if (queryIds.length === 0) queryIds.push(new mongoose.Types.ObjectId());

  const requests = await StudentRequest.find({ labId: { $in: queryIds } }).sort({ requestedAt: -1 });
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @desc    Approve bulk student requests
// @route   PUT /api/student-requests/approve-bulk
// @access  Private (Lab Admin)
const approveBulk = asyncHandler(async (req, res) => {
  const { group, experimentNo, requestIds } = req.body;
  const labId = req.query.labId || req.body.labId || req.user.labId;

  let query = {};
  if (Array.isArray(requestIds) && requestIds.length > 0) {
    query = { _id: { $in: requestIds } };
  } else if (group && experimentNo !== undefined) {
    query = { group, experimentNo, overallStatus: 'Pending' };
    if (labId) query.labId = labId;
  } else {
    // Fallback: approve all pending requests for labId if provided
    if (labId) {
      query = { labId, overallStatus: 'Pending' };
    } else {
      res.status(400);
      throw new Error('Please provide requestIds or group & experimentNo for bulk approval');
    }
  }

  // Find all pending requests matching query
  const requests = await StudentRequest.find(query);

  if (requests.length === 0) {
    return res.status(200).json({ success: true, count: 0, message: 'No pending requests found to approve' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const io = getIo();
    
    for (const reqObj of requests) {
      const chemicalsUsed = [];

      for (let chem of reqObj.chemicalsRequested) {
        // Find inventory matching chemical name (case insensitive)
        const invItem = await Inventory.findOne({
          $or: [
            { labId: reqObj.labId, chemicalName: { $regex: new RegExp(`^${chem.chemicalName}$`, 'i') } },
            { chemicalName: { $regex: new RegExp(`^${chem.chemicalName}$`, 'i') } }
          ]
        }).session(session);

        if (invItem) {
          const qtyToDeduct = Math.min(invItem.quantity || 0, chem.quantityRequested || 0);
          invItem.quantity = Math.max(0, (invItem.quantity || 0) - (chem.quantityRequested || 0));
          await invItem.save({ session });

          chemicalsUsed.push({
            chemicalName: chem.chemicalName,
            quantityUsed: chem.quantityRequested,
            unit: chem.unit,
            costPerUnit: invItem.costPerUnit || 0,
            totalCost: (invItem.costPerUnit || 0) * (chem.quantityRequested || 0)
          });
        } else {
          chemicalsUsed.push({
            chemicalName: chem.chemicalName,
            quantityUsed: chem.quantityRequested,
            unit: chem.unit,
            costPerUnit: 0,
            totalCost: 0
          });
        }

        chem.status = 'Approved';
      }

      reqObj.overallStatus = 'Approved';
      reqObj.approvedAt = Date.now();
      reqObj.approvedBy = req.user.id;
      reqObj.approvedByName = req.user.name || req.user.email || 'Lab Admin';
      
      await reqObj.save({ session });

      if (chemicalsUsed.length > 0) {
        const totalCost = chemicalsUsed.reduce((acc, curr) => acc + curr.totalCost, 0);
        await LabHistory.create([{
          type: "Student Experiment",
          labId: reqObj.labId,
          labName: reqObj.labName,
          year: reqObj.year,
          semester: reqObj.semester,
          subject: reqObj.subject,
          experimentNo: reqObj.experimentNo,
          experimentName: reqObj.experimentName,
          studentId: reqObj.studentId,
          studentName: reqObj.studentName,
          rollNumber: reqObj.rollNumber,
          group: reqObj.group,
          chemicalsUsed,
          totalCost,
          approvedBy: req.user.name || 'Lab Admin',
        }], { session });
      }

      // Notify student via socket
      if (io) {
        io.to(reqObj.studentId.toString()).emit('notification', {
          title: 'Request Approved',
          message: `Your request for ${reqObj.experimentName} has been approved.`
        });
      }
    }

    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ success: true, count: requests.length, message: `Successfully approved ${requests.length} request(s) and updated inventory` });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500);
    throw new Error('Bulk approval failed: ' + error.message);
  }
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
    const chemicalsUsed = [];

    for (let chemReq of studentRequest.chemicalsRequested) {
      // Find inventory
      const invItem = await Inventory.findOne({
        $or: [
          { labId: studentRequest.labId, chemicalName: { $regex: new RegExp(`^${chemReq.chemicalName}$`, 'i') } },
          { chemicalName: { $regex: new RegExp(`^${chemReq.chemicalName}$`, 'i') } }
        ]
      }).session(session);

      if (invItem) {
        invItem.quantity = Math.max(0, (invItem.quantity || 0) - (chemReq.quantityRequested || 0));
        await invItem.save({ session });
        
        chemicalsUsed.push({
          chemicalName: chemReq.chemicalName,
          quantityUsed: chemReq.quantityRequested,
          unit: chemReq.unit,
          costPerUnit: invItem.costPerUnit || 0,
          totalCost: (invItem.costPerUnit || 0) * (chemReq.quantityRequested || 0)
        });
      } else {
        chemicalsUsed.push({
          chemicalName: chemReq.chemicalName,
          quantityUsed: chemReq.quantityRequested,
          unit: chemReq.unit,
          costPerUnit: 0,
          totalCost: 0
        });
      }

      chemReq.status = 'Approved';
    }

    studentRequest.overallStatus = 'Approved';
    studentRequest.approvedAt = Date.now();
    studentRequest.approvedBy = req.user.id;
    
    await studentRequest.save({ session });

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
      approvedBy: req.user.name || 'Lab Admin',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Notify student
    const io = getIo();
    if (io) {
      io.to(studentRequest.studentId.toString()).emit('notification', {
        title: 'Request Approved',
        message: `Your request for ${studentRequest.experimentName} has been approved.`
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

// @desc    Get aggregated lab chemical demand & deficit calculation across pending student requests
// @route   GET /api/student/requests/aggregated
// @access  Private (Lab Admin)
const getAggregatedLabDemand = asyncHandler(async (req, res) => {
  const rawLabId = req.query.labId || req.user.labId;
  const queryIds = [];
  if (rawLabId && mongoose.Types.ObjectId.isValid(rawLabId)) {
    queryIds.push(new mongoose.Types.ObjectId(rawLabId));
  } else if (rawLabId) {
    const lab = await mongoose.model('Lab').findOne({ $or: [{ labCode: rawLabId }, { name: rawLabId }, { labName: rawLabId }] });
    if (lab) queryIds.push(new mongoose.Types.ObjectId(lab._id));
  }
  if (queryIds.length === 0) queryIds.push(new mongoose.Types.ObjectId());

  const pendingRequests = await StudentRequest.find({
    labId: { $in: queryIds },
    overallStatus: { $in: ['Pending', 'Waiting Store Approval', 'Stock In Lab'] }
  });

  const demandMap = {};

  pendingRequests.forEach(reqObj => {
    reqObj.chemicalsRequested.forEach(chem => {
      const nameKey = (chem.chemicalName || '').trim().toLowerCase();
      if (!nameKey) return;

      if (!demandMap[nameKey]) {
        demandMap[nameKey] = {
          chemicalName: chem.chemicalName,
          totalRequested: 0,
          unit: chem.unit || 'mL',
          studentCount: 0
        };
      }
      demandMap[nameKey].totalRequested += Number(chem.quantityRequested || 0);
      demandMap[nameKey].studentCount += 1;
    });
  });

  const targetLabId = queryIds[0];
  const labInventoryItems = await Inventory.find({ labId: targetLabId });

  const aggregatedList = [];
  let hasDeficit = false;
  const suggestedRequisition = [];

  for (const key of Object.keys(demandMap)) {
    const demand = demandMap[key];
    const invItem = labInventoryItems.find(i => 
      (i.chemicalName || i.itemName || '').trim().toLowerCase() === key
    );

    const availableStock = invItem ? Number(invItem.quantityAvailable !== undefined ? invItem.quantityAvailable : invItem.quantity || 0) : 0;
    const deficit = Math.max(0, demand.totalRequested - availableStock);

    if (deficit > 0) {
      hasDeficit = true;
      suggestedRequisition.push({
        chemicalName: demand.chemicalName,
        quantityRequested: deficit,
        unit: demand.unit,
        reason: `Deficit for ${demand.studentCount} student requests`
      });
    }

    aggregatedList.push({
      chemicalName: demand.chemicalName,
      totalRequested: demand.totalRequested,
      unit: demand.unit,
      availableInLab: availableStock,
      deficit: deficit,
      status: deficit === 0 ? 'Sufficient' : 'Deficit',
      studentCount: demand.studentCount
    });
  }

  res.status(200).json({
    success: true,
    pendingStudentCount: pendingRequests.length,
    hasDeficit,
    chemicals: aggregatedList,
    suggestedRequisition
  });
});

module.exports = {
  createRequest,
  getMyRequests,
  getStudentRequestsForLab,
  getLabRequests,
  getAggregatedLabDemand,
  approveBulk,
  approveRequest,
  rejectRequest,
  getStudentHistory,
  getLabHistory
};
