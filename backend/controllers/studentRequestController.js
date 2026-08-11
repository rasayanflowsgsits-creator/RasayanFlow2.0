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
  const { group, experimentNo } = req.body;
  const labId = req.user.labId;

  if (!group || experimentNo === undefined) {
    res.status(400);
    throw new Error('Group and Experiment Number are required for bulk approval');
  }

  // Find all pending requests for this group and experiment
  const requests = await StudentRequest.find({
    labId,
    group,
    experimentNo,
    overallStatus: 'Pending'
  });

  if (requests.length === 0) {
    res.status(400);
    throw new Error('No pending requests found for this group and experiment');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Aggregate required quantities
    const requiredQuantities = {}; // { 'Chemical Name': { quantity: X, unit: 'ml' } }
    
    requests.forEach(reqObj => {
      reqObj.chemicalsRequested.forEach(chem => {
        const name = chem.chemicalName.toLowerCase();
        if (!requiredQuantities[name]) {
          requiredQuantities[name] = { 
            name: chem.chemicalName, 
            quantity: 0, 
            unit: chem.unit 
          };
        }
        requiredQuantities[name].quantity += chem.quantityRequested;
      });
    });

    // 2. Check and deduct inventory
    let allAvailable = true;
    let anyAvailable = false;
    const missingChemicals = [];
    
    for (const [key, reqData] of Object.entries(requiredQuantities)) {
      const invItem = await Inventory.findOne({
        labId,
        chemicalName: { $regex: new RegExp(`^${reqData.name}$`, 'i') }
      }).session(session);

      if (!invItem || invItem.quantity < reqData.quantity) {
        allAvailable = false;
        missingChemicals.push({
          name: reqData.name,
          needed: reqData.quantity,
          available: invItem ? invItem.quantity : 0
        });
      } else {
        anyAvailable = true;
        invItem.quantity -= reqData.quantity;
        await invItem.save({ session });
      }
    }

    if (!allAvailable && !req.body.forceApproveAvailable) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient inventory for bulk approval',
        missingChemicals
      });
    }

    // 3. Mark requests as approved and create histories
    const io = getIo();
    
    for (const reqObj of requests) {
      const chemicalsUsed = [];
      let reqAllApproved = true;
      let reqAnyApproved = false;

      for (let chem of reqObj.chemicalsRequested) {
        const invItem = await Inventory.findOne({
          labId,
          chemicalName: { $regex: new RegExp(`^${chem.chemicalName}$`, 'i') }
        }).session(session);

        // If forceApproveAvailable is true, we only approve what was available
        if (allAvailable || (req.body.forceApproveAvailable && invItem && invItem.quantity >= 0)) {
           // We already deducted the total sum from inventory above. 
           // We just need to mark it approved.
           chem.status = 'Approved';
           reqAnyApproved = true;
           chemicalsUsed.push({
             chemicalName: chem.chemicalName,
             quantityUsed: chem.quantityRequested,
             unit: chem.unit,
             costPerUnit: invItem ? invItem.costPerUnit : 0,
             totalCost: (invItem ? invItem.costPerUnit : 0) * chem.quantityRequested
           });
        } else {
           chem.status = 'Pending';
           reqAllApproved = false;
        }
      }

      reqObj.overallStatus = reqAllApproved ? 'Approved' : (reqAnyApproved ? 'Partial' : 'Pending');
      reqObj.approvedAt = Date.now();
      reqObj.approvedBy = req.user.id;
      
      await reqObj.save({ session });

      if (reqAnyApproved) {
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
          approvedBy: req.user.name,
        }], { session });
      }

      // Notify student
      if (io) {
        io.to(reqObj.studentId.toString()).emit('notification', {
          title: 'Request Updated',
          message: `Your request for ${reqObj.experimentName} has been ${reqObj.overallStatus}.`
        });
      }
    }

    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ success: true, count: requests.length, message: 'Bulk approval successful' });

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
