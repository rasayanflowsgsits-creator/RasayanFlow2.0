const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const LabRequest = require('../models/LabRequest');
const LabHistory = require('../models/LabHistory');
const Inventory = require('../models/Inventory');
const { getIo } = require('../sockets');
const { safeRound } = require('../utils/storeHelpers');

const createRequest = asyncHandler(async (req, res) => {
  const { labId, labName, chemicalName, quantityRequested, unit, purpose, groupName } = req.body;
  const timestamp = Date.now();
  
  const newRequest = await LabRequest.create({
    requestId: `LAB-REQ-${timestamp}`,
    studentId: req.user._id,
    studentName: req.user.name,
    labId,
    labName,
    chemicalName,
    quantityRequested,
    unit,
    purpose,
    groupName
  });
  
  res.status(201).json(newRequest);
});

const getRequests = asyncHandler(async (req, res) => {
  const labId = req.user.labId;
  const requests = await LabRequest.find({ labId }).sort({ requestedAt: -1 });
  res.status(200).json(requests);
});

const getMyRequests = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const requests = await LabRequest.find({ studentId }).sort({ requestedAt: -1 });
  res.status(200).json(requests);
});

const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await LabRequest.findById(id).session(session);
    if (!request) throw new Error("Request not found");
    if (request.status !== "Pending") throw new Error("Request is already processed");

    const chemical = await Inventory.findOne({
      labId: request.labId,
      chemicalName: request.chemicalName
    }).session(session);

    if (!chemical) throw new Error("Chemical not found in lab inventory");

    // Check if enough stock
    const availableQty = chemical.quantityAvailable || 0;
    const requestedQty = request.quantityRequested;

    if (availableQty < requestedQty) {
      throw new Error(`Insufficient stock. Available: ${availableQty}${chemical.quantityUnit}, Requested: ${requestedQty}${request.unit}`);
    }

    // Reduce lab inventory
    const newAvailableQty = safeRound(availableQty - requestedQty);
    const costPerBase = chemical.costPerBase || 0;
    const valueBefore = safeRound(availableQty * costPerBase);
    const valueAfter = safeRound(newAvailableQty * costPerBase);
    const valueUsed = safeRound(requestedQty * costPerBase);

    chemical.quantityAvailable = newAvailableQty;
    chemical.quantity = newAvailableQty; // fallback update
    chemical.totalValue = valueAfter;
    
    // Status recalculated automatically in pre-save hook, but we do it manually to be safe
    const minThreshold = chemical.minThreshold || 0;
    if (chemical.quantityAvailable <= 0) chemical.status = 'Out of Stock';
    else if (chemical.quantityAvailable <= minThreshold) chemical.status = 'Low Stock';
    else chemical.status = 'In Stock';
    
    chemical.lastUpdated = Date.now();
    await chemical.save({ session });

    // Save labHistory
    await LabHistory.create([{
      type: "Lab to Student Transfer",
      chemicalName: request.chemicalName,
      labId: request.labId,
      labName: request.labName,
      studentId: request.studentId,
      studentName: request.studentName,
      groupName: request.groupName,
      qtyBefore: availableQty,
      qtyRequested: requestedQty,
      qtyAfter: newAvailableQty,
      unit: request.unit,
      costPerBase: costPerBase,
      valueBefore: valueBefore,
      valueAfter: valueAfter,
      valueUsed: valueUsed,
      purpose: request.purpose,
      action: "Approved",
      approvedBy: req.user.name,
      timestamp: Date.now()
    }], { session });

    // Update request
    request.status = "Approved";
    request.approvedBy = req.user._id;
    request.approvedAt = Date.now();
    await request.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    // Create Notification and Emit Socket (outside transaction)
    const io = getIo();
    io.to(request.studentId.toString()).emit('lab-request-approved', {
      chemical: request.chemicalName,
      quantity: request.quantityRequested,
      unit: request.unit
    });

    res.status(200).json(request);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw new Error(error.message);
  }
});

const rejectRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  
  const request = await LabRequest.findById(id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.status !== "Pending") {
    res.status(400);
    throw new Error('Request is already processed');
  }

  request.status = "Rejected";
  request.rejectedAt = Date.now();
  request.rejectionReason = rejectionReason;
  await request.save();

  await LabHistory.create({
    type: "Lab to Student Transfer",
    chemicalName: request.chemicalName,
    labId: request.labId,
    labName: request.labName,
    studentId: request.studentId,
    studentName: request.studentName,
    groupName: request.groupName,
    qtyRequested: request.quantityRequested,
    unit: request.unit,
    purpose: request.purpose,
    action: "Rejected",
    approvedBy: req.user.name,
    timestamp: Date.now()
  });

  const io = getIo();
  io.to(request.studentId.toString()).emit('lab-request-rejected', request);

  res.status(200).json(request);
});

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  approveRequest,
  rejectRequest
};
