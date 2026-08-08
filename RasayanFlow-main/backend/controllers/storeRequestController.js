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

    // A & B: Parse pack size
    const packData = parsePackSize(chemical.packSize);
    const availableQtyUNT = chemical.availableQty || 0;
    
    // C: Calculate total base stock
    const totalBase = safeRound(availableQtyUNT * packData.baseValue);

    // Convert requested unit to base unit if necessary
    let requestedBase = Number(request.quantityRequested) || 0;
    const reqUnit = (request.unit || '').toLowerCase().replace(/\s+/g, '');

    if ((reqUnit.includes('kg') || reqUnit === 'kilogram' || reqUnit === 'kilograms') && packData.baseUnit === 'g') {
      requestedBase = safeRound(requestedBase * 1000);
    } else if ((reqUnit.includes('l') && reqUnit !== 'ml' && reqUnit !== 'milliliter' && reqUnit !== 'milliliters') && packData.baseUnit === 'ml') {
      requestedBase = safeRound(requestedBase * 1000);
    }
    
    if (totalBase < requestedBase) {
      throw new Error(`Insufficient stock. Total base available: ${totalBase} ${packData.baseUnit}, Requested: ${requestedBase} ${packData.baseUnit}`);
    }
    
    // D: Subtract requested quantity
    const remainingBase = safeRound(totalBase - requestedBase);
    
    // E: Convert back to UNT
    const newAvailableQtyUNT = safeRound(remainingBase / packData.baseValue);
    
    const qtyBeforeUNT = availableQtyUNT;
    const valueBefore = safeRound(availableQtyUNT * (chemical.unitPrice || 0));
    const unitPrice = chemical.unitPrice || 0;

    // F: Update storeInventory
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
      'Issued to Lab',
      qtyBeforeUNT,
      unitPrice,
      chemical.availableQty,
      unitPrice
    )], sessionOption);

    // Calculate costPerBase
    const costPerBase = safeRound(unitPrice / packData.baseValue);

    // G: Add to labInventory
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
          inchi: chemical.inchiKey || '',
          chemicalFormula: chemical.formula || '',
          manufacturingCompany: chemical.supplier || '',
          entryDate: Date.now()
        }], sessionOption);
      }
    }

    // I: Update storeRequest
    request.status = "Approved";
    request.approvedBy = req.user._id;
    request.approvedAt = Date.now();
    request.receiptNumber = await getNextReceiptNumber();
    await request.save(sessionOption);

    // H: Save storeHistory
    const valueReleased = safeRound(valueBefore - chemical.totalValue);
    
    await StoreHistory.create([{
      type: "Store to Lab Transfer",
      requestId: request._id,
      chemicalName: chemical.name,
      chemicalId: chemical.chemicalId || '',
      labName: request.labName,
      labId: request.labId,
      
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

    // J: Create notification
    const User = require('../models/User');
    const labAdminQuery = inTransaction
      ? User.find({ labId: request.labId, role: 'labAdmin' }).session(session)
      : User.find({ labId: request.labId, role: 'labAdmin' });

    const labAdmins = await labAdminQuery;
    
    if (labAdmins.length > 0) {
      const notifications = labAdmins.map(admin => ({
        userId: admin._id,
        labId: request.labId,
        type: "request_approved",
        message: `${request.chemicalName} ${request.quantityRequested}${request.unit} approved by Store Manager`,
        chemicalName: request.chemicalName,
        quantity: request.quantityRequested,
        unit: request.unit,
        requestId: request._id,
        receiptNumber: request.receiptNumber
      }));
      await StoreNotification.create(notifications, sessionOption);
    }

    // K: Commit Transaction if active
    if (inTransaction) {
      await session.commitTransaction();
    }
    session.endSession();

    const io = getIo();
    if (request.labId) {
      io.to(request.labId.toString()).emit('request-approved', {
        chemical: chemical.name,
        quantity: request.quantityRequested,
        unit: request.unit
      });
    }
    if (chemical.status === 'Low Stock' || chemical.status === 'Out of Stock') {
       io.emit('low-stock-alert', chemical);
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
    quantityRequested: request.quantityRequested,
    unit: request.unit,
    action: "Rejected",
    approvedBy: req.user.name,
    timestamp: Date.now()
  });

  const User = require('../models/User');
  const labAdmins = await User.find({ labId: request.labId, role: 'labAdmin' });
  
  if (labAdmins.length > 0) {
    const notifications = labAdmins.map(admin => ({
      userId: admin._id,
      labId: request.labId,
      type: "request_rejected",
      message: `Your request for ${request.chemicalName} has been rejected. Reason: ${rejectionReason}`,
      chemicalName: request.chemicalName,
      quantity: request.quantityRequested,
      unit: request.unit,
      requestId: request._id
    }));
    await StoreNotification.create(notifications);
  }

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
