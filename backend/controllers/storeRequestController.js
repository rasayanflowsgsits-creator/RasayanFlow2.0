const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const StoreRequest = require('../models/StoreRequest');
const StoreInventory = require('../models/StoreInventory');
const StoreHistory = require('../models/StoreHistory');
const StoreTracking = require('../models/StoreTracking');
const StoreNotification = require('../models/StoreNotification');
const { getNextReceiptNumber } = require('../utils/receiptCounter');
const { getIo } = require('../sockets');
const { parsePackSize, safeRound, totalStock } = require('../utils/storeHelpers');

const Inventory = require('../models/Inventory');

const calculateStatus = (qty, reorderLevel) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= (reorderLevel || 2)) return 'Low Stock';
  return 'In Stock';
};

const buildTrackingLog = (chemical, updateType, previousQty, previousPrice, newQty, newPrice) => {
  const stockData = totalStock(newQty, chemical.packSize);
  const totalChemStr = newQty ? `${stockData.total} ${stockData.unit}` : '--';
  return {
    chemicalId: chemical.chemicalId,
    chemicalName: chemical.name,
    casNumber: chemical.cas || '',
    formula: chemical.formula || '',
    smiles: chemical.smiles || '',
    grade: chemical.grade || '',
    packSize: chemical.packSize || '',
    updateType,
    previousQty: safeRound(previousQty),
    newQty: safeRound(newQty),
    qtyChange: safeRound(newQty - previousQty),
    previousPrice: safeRound(previousPrice),
    newPrice: safeRound(newPrice),
    totalChemical: totalChemStr,
    totalPrice: safeRound(newQty * newPrice),
    totalValue: safeRound(newQty * newPrice),
    status: calculateStatus(newQty, chemical.reorderLevel),
    snapshot: typeof chemical.toObject === 'function' ? chemical.toObject() : chemical,
  };
};

const createRequest = asyncHandler(async (req, res) => {
  const requestData = { ...req.body };
  const timestamp = Date.now();
  requestData.requestId = `REQ-${timestamp}`;
  if (req.user?.labId) {
    requestData.labId = req.user.labId;
  }
  requestData.studentId = req.user?._id;
  requestData.studentName = req.user?.name || req.user?.email || 'PhD Scholar';

  if (req.body.isPhD || req.body.requestType === 'PhD Research' || req.user?.course === 'PhD' || req.body.isPhDRequest) {
    requestData.requestType = 'PhD Research';
    requestData.course = 'PhD';
    requestData.labName = requestData.labName || 'PhD Research Scholar';
  }

  const newRequest = await StoreRequest.create(requestData);

  // Emit socket event to store manager
  const io = getIo();
  if (io) {
    io.emit('store:new_request', {
      requestId: newRequest.requestId,
      itemName: newRequest.chemicalName,
      studentName: newRequest.studentName,
      requestType: newRequest.requestType
    });
  }

  res.status(201).json(newRequest);
});

const getAllRequests = asyncHandler(async (req, res) => {
  let requests = await StoreRequest.find({}).sort({ requestedAt: -1 }).populate('labId', 'name labName labCode');

  if (requests.length === 0) {
    const Lab = require('../models/Lab');
    const labs = await Lab.find({});
    const storeChems = await StoreInventory.find({});

    const lab1 = labs[0] || { _id: new mongoose.Types.ObjectId(), labName: 'Pharmaceutics Lab - I' };
    const lab2 = labs[1] || { _id: new mongoose.Types.ObjectId(), labName: 'Pharmaceutical Analysis Lab' };

    const chem1 = storeChems[0] || { _id: 'c1', name: 'Paracetamol IP', unitPrice: 140, unit: 'g' };
    const chem2 = storeChems[1] || { _id: 'c2', name: 'Hydrochloric Acid 0.1M', unitPrice: 85, unit: 'mL' };

    const sampleRequests = [
      { requestId: 'REQ-2026-001', labId: lab1._id, labName: lab1.labName || lab1.name, chemicalName: chem1.name, chemicalId: chem1.chemicalId || 'c1', quantityRequested: 500, unit: 'g', status: 'Approved', requestedAt: new Date(Date.now() - 5 * 86400000), approvedAt: new Date(Date.now() - 4 * 86400000), receiptNumber: 'REC-2026-101', estimatedCost: 70000, requestType: 'Lab Requisition' },
      { requestId: 'REQ-2026-002', labName: 'PhD Research Scholar', chemicalName: 'Silver Nitrate 0.1N', quantityRequested: 100, unit: 'mL', reason: 'Synthesis of Silver Nanoparticles for Target Drug Delivery', projectThesisName: 'Nano-Drug Delivery Thesis', supervisorName: 'Dr. Omprakash Tanwar', requestType: 'PhD Research', status: 'Pending', requestedAt: new Date(Date.now() - 1 * 86400000) }
    ];

    for (const item of sampleRequests) {
      try {
        await StoreRequest.create(item);
      } catch (e) { /* ignore */ }
    }

    requests = await StoreRequest.find({}).sort({ requestedAt: -1 }).populate('labId', 'name labName labCode');
  }

  res.status(200).json(requests);
});

const getMyRequests = asyncHandler(async (req, res) => {
  const filter = {
    $or: [
      { studentId: req.user._id },
      ...(req.user.labId ? [{ labId: req.user.labId }] : [])
    ]
  };
  const requests = await StoreRequest.find(filter).sort({ requestedAt: -1 });
  res.status(200).json(requests);
});

const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  let inTransaction = false;
  try {
    session.startTransaction();
    inTransaction = true;
  } catch (e) {
    inTransaction = false;
  }

  const sessionOption = inTransaction ? { session } : {};

  try {
    const request = inTransaction
      ? await StoreRequest.findById(id).session(session)
      : await StoreRequest.findById(id);

    if (!request) throw new Error("Request not found");
    if (request.status !== "Pending") throw new Error("Request is already processed");

    const cleanChemName = (request.chemicalName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const chemicalSearch = inTransaction
      ? StoreInventory.findOne({
          $or: [
            { chemicalId: request.chemicalId },
            { name: new RegExp('^' + cleanChemName + '$', 'i') }
          ]
        }).session(session)
      : StoreInventory.findOne({
          $or: [
            { chemicalId: request.chemicalId },
            { name: new RegExp('^' + cleanChemName + '$', 'i') }
          ]
        });

    const chemical = await chemicalSearch;
    if (!chemical) throw new Error("Chemical not found in store inventory");

    // Parse pack size
    const packData = parsePackSize(chemical.packSize);
    const availableQtyUNT = chemical.availableQty || 0;
    
    // Calculate total base stock
    const totalBase = safeRound(availableQtyUNT * packData.baseValue);

    // Convert requested unit to base unit
    let requestedBase = Number(request.quantityRequested) || 0;
    const reqUnit = (request.unit || '').toLowerCase().replace(/\s+/g, '');

    if ((reqUnit.includes('kg') || reqUnit === 'kilogram') && packData.baseUnit === 'g') {
      requestedBase = safeRound(requestedBase * 1000);
    } else if ((reqUnit.includes('l') && reqUnit !== 'ml') && packData.baseUnit === 'ml') {
      requestedBase = safeRound(requestedBase * 1000);
    }
    
    if (totalBase < requestedBase) {
      throw new Error(`Insufficient store stock. Base available: ${totalBase} ${packData.baseUnit}, Requested: ${requestedBase} ${packData.baseUnit}`);
    }
    
    // Subtract requested quantity
    const remainingBase = safeRound(totalBase - requestedBase);
    const newAvailableQtyUNT = safeRound(remainingBase / packData.baseValue);
    
    const qtyBeforeUNT = availableQtyUNT;
    const valueBefore = safeRound(availableQtyUNT * (chemical.unitPrice || 0));
    const unitPrice = chemical.unitPrice || 0;

    // Update storeInventory
    chemical.availableQty = newAvailableQtyUNT;
    const reorderLevel = chemical.reorderLevel || 2;
    if (chemical.availableQty <= 0) chemical.status = 'Out of Stock';
    else if (chemical.availableQty <= reorderLevel) chemical.status = 'Low Stock';
    else chemical.status = 'In Stock';
    
    chemical.totalValue = safeRound(chemical.availableQty * unitPrice);
    chemical.updatedAt = Date.now();
    await chemical.save(sessionOption);

    await StoreTracking.create([buildTrackingLog(
      chemical,
      request.requestType === 'PhD Research' ? 'Issued to PhD Scholar' : 'Issued to Lab',
      qtyBeforeUNT,
      unitPrice,
      chemical.availableQty,
      unitPrice
    )], sessionOption);

    const costPerBase = safeRound(unitPrice / packData.baseValue);

    // Add to labInventory if labId is provided
    if (request.labId) {
      const labInvQuery = inTransaction
        ? Inventory.findOne({ labId: request.labId, chemicalName: chemical.name }).session(session)
        : Inventory.findOne({ labId: request.labId, chemicalName: chemical.name });

      let labInventory = await labInvQuery;
      
      if (labInventory) {
        labInventory.quantityAvailable = safeRound((labInventory.quantityAvailable || 0) + requestedBase);
        labInventory.quantityReceived = safeRound((labInventory.quantityReceived || 0) + requestedBase);
        labInventory.costPerBase = costPerBase;
        labInventory.totalValue = safeRound(labInventory.quantityAvailable * costPerBase);
        labInventory.lastUpdated = Date.now();
        await labInventory.save(sessionOption);
      } else {
        await Inventory.create([{
          labId: request.labId,
          labName: request.labName,
          itemCode: `CHEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemName: chemical.name,
          chemicalName: chemical.name,
          chemicalId: chemical.chemicalId || '',
          casNumber: chemical.cas || '',
          grade: chemical.grade || '',
          category: chemical.grade || 'General',
          quantityReceived: requestedBase,
          quantityAvailable: requestedBase,
          quantityUnit: packData.baseUnit,
          costPerBase: costPerBase,
          totalValue: safeRound(requestedBase * costPerBase),
          source: "Store Transfer",
          requestId: request._id,
          receivedDate: Date.now(),
          status: "In Stock",
          minThreshold: 0,
          smiles: chemical.smiles || '',
          chemicalFormula: chemical.formula || '',
          entryDate: Date.now()
        }], sessionOption);
      }
    }

    // Update storeRequest
    request.status = "Approved";
    request.approvedBy = req.user._id;
    request.approvedAt = Date.now();
    request.receiptNumber = await getNextReceiptNumber();
    await request.save(sessionOption);

    // Save storeHistory
    const valueReleased = safeRound(valueBefore - chemical.totalValue);
    
    await StoreHistory.create([{
      type: request.requestType === 'PhD Research' ? 'Direct PhD Requisition' : 'Store to Lab Transfer',
      requestId: request._id,
      chemicalName: chemical.name,
      chemicalId: chemical.chemicalId || '',
      labName: request.labName || 'PhD Research Scholar',
      labId: request.labId,
      studentName: request.studentName,
      qtyBeforeUNT: qtyBeforeUNT,
      qtyAfterUNT: chemical.availableQty,
      qtyBeforeBase: totalBase,
      qtyRequestedBase: requestedBase,
      qtyAfterBase: remainingBase,
      baseUnit: packData.baseUnit,
      unit: request.unit,
      unitPrice: unitPrice,
      costPerBase: costPerBase,
      valueBefore: safeRound(valueBefore),
      valueAfter: safeRound(chemical.totalValue),
      valueReleased: valueReleased,
      receiptNumber: request.receiptNumber,
      action: "Approved",
      approvedBy: req.user.name || 'Store Manager',
      timestamp: Date.now()
    }], sessionOption);

    // Create notifications for Student or Lab Admin
    const notifUsers = [];
    if (request.studentId) notifUsers.push(request.studentId);
    
    if (request.labId) {
      const User = require('../models/User');
      const labAdmins = await User.find({ labId: request.labId, role: 'labAdmin' });
      labAdmins.forEach(a => notifUsers.push(a._id));
    }

    const uniqueUserIds = Array.from(new Set(notifUsers.map(id => String(id))));
    if (uniqueUserIds.length > 0) {
      const notifications = uniqueUserIds.map(uId => ({
        userId: uId,
        labId: request.labId,
        type: "request_approved",
        message: `PhD Direct Requisition for ${request.chemicalName} (${request.quantityRequested}${request.unit}) approved by Store Manager`,
        chemicalName: request.chemicalName,
        quantity: request.quantityRequested,
        unit: request.unit,
        requestId: request._id,
        receiptNumber: request.receiptNumber
      }));
      await StoreNotification.create(notifications, sessionOption);
    }

    if (inTransaction) {
      await session.commitTransaction();
    }
    session.endSession();

    const io = getIo();
    if (io) {
      io.emit('store:request_approved', {
        requestId: request.requestId,
        itemName: chemical.name,
        quantity: request.quantityRequested,
        unit: request.unit,
        receiptNumber: request.receiptNumber,
        studentName: request.studentName
      });
    }

    res.status(200).json(request);
  } catch (error) {
    if (inTransaction) {
      await session.abortTransaction();
    }
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
    studentName: request.studentName,
    quantityRequested: request.quantityRequested,
    unit: request.unit,
    action: "Rejected",
    approvedBy: req.user.name,
    timestamp: Date.now()
  });

  if (request.studentId) {
    await StoreNotification.create({
      userId: request.studentId,
      type: "request_rejected",
      message: `Your research request for ${request.chemicalName} has been rejected by Store Manager. Reason: ${rejectionReason}`,
      chemicalName: request.chemicalName,
      quantity: request.quantityRequested,
      unit: request.unit,
      requestId: request._id
    });
  }

  const io = getIo();
  if (io) {
    io.emit('store:request_rejected', request);
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
