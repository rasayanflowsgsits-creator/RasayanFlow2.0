const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const StoreRequest = require('../models/StoreRequest');
const StoreInventory = require('../models/StoreInventory');
const StoreHistory = require('../models/StoreHistory');
const StoreNotification = require('../models/StoreNotification');
const { getNextReceiptNumber } = require('../utils/receiptCounter');
const { getIo } = require('../sockets');

const Inventory = require('../models/Inventory');

const createRequest = asyncHandler(async (req, res) => {
  const requestData = req.body;
  
  const timestamp = Date.now();
  requestData.requestId = `REQ-${timestamp}`;
  requestData.labId = req.user.labId; 
  
  const newRequest = await StoreRequest.create(requestData);
  res.status(201).json(newRequest);
});

const getAllRequests = asyncHandler(async (req, res) => {
  const requests = await StoreRequest.find({}).sort({ requestedAt: -1 }).populate('labId', 'name labName labCode');
  res.status(200).json(requests);
});

const getMyRequests = asyncHandler(async (req, res) => {
  const labId = req.user.labId;
  const requests = await StoreRequest.find({ labId }).sort({ requestedAt: -1 });
  res.status(200).json(requests);
});

const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await StoreRequest.findById(id).session(session);
    if (!request) throw new Error("Request not found");
    if (request.status !== "Pending") throw new Error("Request is already processed");

    const chemical = await StoreInventory.findOne({
      $or: [
        { chemicalId: request.chemicalId },
        { name: request.chemicalName }
      ]
    }).session(session);

    if (!chemical) throw new Error("Chemical not found in store inventory");

    const packSize = parseFloat(chemical.packSize) || 1;
    const availableQty = chemical.availableQty || 0;
    
    const totalBase = availableQty * packSize;
    if (totalBase < request.quantityRequested) {
      throw new Error("Insufficient stock");
    }
    
    const newBase = totalBase - request.quantityRequested;
    const newAvailableQty = newBase / packSize;
    
    const qtyBefore = chemical.availableQty;
    const valueBefore = chemical.totalValue;

    chemical.availableQty = newAvailableQty;
    const reorderLevel = chemical.reorderLevel || 2;
    if (chemical.availableQty <= 0) chemical.status = 'Out of Stock';
    else if (chemical.availableQty <= reorderLevel) chemical.status = 'Low Stock';
    else chemical.status = 'In Stock';
    
    chemical.totalValue = chemical.availableQty * (chemical.unitPrice || 0);
    chemical.updatedAt = Date.now();
    await chemical.save({ session });

    // Update Lab Inventory automatically
    if (request.labId) {
      let labInventory = await Inventory.findOne({ labId: request.labId, chemicalName: chemical.name }).session(session);
      if (labInventory) {
        labInventory.quantity += request.quantityRequested;
        labInventory.entryDate = Date.now();
        labInventory.lastUpdated = Date.now();
        await labInventory.save({ session });
      } else {
        await Inventory.create([{
          labId: request.labId,
          itemCode: `CHEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemName: chemical.name,
          chemicalName: chemical.name,
          category: chemical.grade || 'General',
          quantity: request.quantityRequested,
          quantityUnit: request.unit,
          costPerUnit: chemical.unitPrice || 0,
          minThreshold: 0,
          casNumber: chemical.cas || '',
          smiles: chemical.smiles || '',
          inchi: chemical.inchiKey || '',
          chemicalFormula: chemical.formula || '',
          manufacturingCompany: chemical.supplier || '',
          entryDate: Date.now()
        }], { session });
      }
    }

    request.status = "Approved";
    request.approvedBy = req.user._id;
    request.approvedAt = Date.now();
    request.receiptNumber = await getNextReceiptNumber();
    await request.save({ session });

    await StoreHistory.create([{
      requestId: request._id,
      chemicalName: chemical.name,
      chemicalId: chemical.chemicalId,
      labName: request.labName,
      labId: request.labId,
      quantityBefore: qtyBefore,
      quantityRequested: request.quantityRequested,
      quantityAfter: chemical.availableQty,
      unit: request.unit,
      unitPrice: chemical.unitPrice,
      valueBefore: valueBefore,
      valueAfter: chemical.totalValue,
      receiptNumber: request.receiptNumber,
      action: "Approved",
      approvedBy: req.user.name,
      timestamp: Date.now()
    }], { session });

    const notification = await StoreNotification.create([{
      userId: req.user._id, // typically sent to the user who requested, but we send it generally for lab
      labId: request.labId,
      type: "request_approved",
      message: `Your request for ${request.quantityRequested} ${request.unit} of ${request.chemicalName} has been approved.`,
      chemicalName: request.chemicalName,
      quantity: request.quantityRequested,
      unit: request.unit,
      requestId: request._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const io = getIo();
    if (request.labId) {
      io.to(request.labId.toString()).emit('request-approved', request);
    }
    if (chemical.status === 'Low Stock' || chemical.status === 'Out of Stock') {
       io.emit('low-stock-alert', chemical);
    }

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
  
  const request = await StoreRequest.findById(id);
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

  await StoreHistory.create({
    requestId: request._id,
    chemicalName: request.chemicalName,
    chemicalId: request.chemicalId,
    labName: request.labName,
    labId: request.labId,
    quantityRequested: request.quantityRequested,
    unit: request.unit,
    action: "Rejected",
    approvedBy: req.user.name,
    timestamp: Date.now()
  });

  await StoreNotification.create({
    userId: req.user._id,
    labId: request.labId,
    type: "request_rejected",
    message: `Your request for ${request.chemicalName} has been rejected. Reason: ${rejectionReason}`,
    chemicalName: request.chemicalName,
    quantity: request.quantityRequested,
    unit: request.unit,
    requestId: request._id
  });

  const io = getIo();
  if (request.labId) {
    io.to(request.labId.toString()).emit('request-rejected', request);
  }

  res.status(200).json(request);
});

module.exports = {
  createRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest
};
