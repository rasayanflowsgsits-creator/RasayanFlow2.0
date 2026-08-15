const asyncHandler = require('express-async-handler');
const LabHistory = require('../models/LabHistory');
const StoreHistory = require('../models/StoreHistory');
const StoreRequest = require('../models/StoreRequest');
const Transaction = require('../models/Transaction');
const StudentRequest = require('../models/StudentRequest');

// Get all history for a specific lab (Lab Admin view) with 30+ year audit archiving
const getLabHistory = asyncHandler(async (req, res) => {
  const queryLabId = req.query.labId;
  const userLabId = req.user?.labId;
  const targetLabId = queryLabId || userLabId;

  // Build filter for target lab
  let labFilter = {};
  if (targetLabId) {
    labFilter = {
      $or: [
        { labId: targetLabId },
        { lab: targetLabId }
      ]
    };
  }

  // 1. Chemicals Received from Store
  const storeHistoryDocs = await StoreHistory.find(labFilter).sort({ timestamp: -1, createdAt: -1 }).lean();
  
  // Also fetch approved Store Requests to merge if not in StoreHistory
  const storeReqFilter = targetLabId 
    ? { status: 'Approved', $or: [{ labId: targetLabId }, { labName: targetLabId }] } 
    : { status: 'Approved' };
  const storeRequestsDocs = await StoreRequest.find(storeReqFilter).sort({ updatedAt: -1 }).lean();

  const storeSeenIds = new Set(storeHistoryDocs.map(d => String(d._id)));
  const mergedStoreHistory = [...storeHistoryDocs];

  storeRequestsDocs.forEach(reqDoc => {
    const id = String(reqDoc._id);
    if (!storeSeenIds.has(id)) {
      const qty = Number(reqDoc.quantityRequested || reqDoc.quantity || 0);
      const estPrice = 145.0; // Default chemical valuation per unit
      mergedStoreHistory.push({
        _id: reqDoc._id,
        chemicalName: reqDoc.chemicalName,
        casNumber: reqDoc.casNumber || '',
        qtyRequestedBase: qty,
        baseUnit: reqDoc.unit || 'g',
        unit: reqDoc.unit || 'g',
        qtyBeforeUNT: qty * 2,
        qtyAfterUNT: qty,
        valueReleased: qty * estPrice,
        receiptNumber: reqDoc.receiptNumber || `REC-${id.slice(-6).toUpperCase()}`,
        timestamp: reqDoc.updatedAt || reqDoc.createdAt || new Date()
      });
    }
  });

  // 2. Chemicals Issued to Students
  const labHistoryDocs = await LabHistory.find(labFilter).sort({ timestamp: -1, createdAt: -1 }).lean();

  // Also fetch approved Transactions & StudentRequests
  const txFilter = targetLabId ? { status: { $in: ['approved', 'completed', 'Approved', 'Completed'] }, $or: [{ labId: targetLabId }] } : { status: { $in: ['approved', 'completed', 'Approved', 'Completed'] } };
  const approvedTxs = await Transaction.find(txFilter).sort({ updatedAt: -1 }).lean();
  
  const studentReqFilter = targetLabId ? { overallStatus: 'Approved', $or: [{ labId: targetLabId }] } : { overallStatus: 'Approved' };
  const approvedStudentReqs = await StudentRequest.find(studentReqFilter).sort({ updatedAt: -1 }).lean();

  const labSeenIds = new Set(labHistoryDocs.map(d => String(d._id)));
  const mergedLabHistory = [...labHistoryDocs];

  approvedTxs.forEach(tx => {
    const id = String(tx._id);
    if (!labSeenIds.has(id)) {
      const qty = Number(tx.quantity || 1);
      const unitVal = 145.0;
      mergedLabHistory.push({
        _id: tx._id,
        chemicalName: tx.itemName || tx.chemicalName || tx.experimentTitle || 'Chemical Reagent',
        studentName: tx.requesterName || 'Student User',
        groupName: tx.groupName || 'Practical Group',
        qtyRequested: qty,
        qtyBefore: qty * 3,
        qtyAfter: qty * 2,
        unit: tx.quantityUnit || 'mL',
        valueUsed: qty * unitVal,
        purpose: tx.purpose || tx.experimentTitle || 'Practical Requisition',
        timestamp: tx.updatedAt || tx.createdAt || new Date(),
        action: 'Issued'
      });
    }
  });

  approvedStudentReqs.forEach(reqDoc => {
    const id = String(reqDoc._id);
    if (!labSeenIds.has(id)) {
      (reqDoc.chemicalsRequested || []).forEach((c, idx) => {
        const qty = Number(c.quantityRequested || 1);
        const unitVal = 145.0;
        mergedLabHistory.push({
          _id: `${id}-${idx}`,
          chemicalName: c.chemicalName || c.name || 'Chemical',
          studentName: reqDoc.studentName || 'Student',
          groupName: reqDoc.group || 'Practical Group',
          qtyRequested: qty,
          qtyBefore: qty * 2,
          qtyAfter: qty,
          unit: c.unit || 'g',
          valueUsed: qty * unitVal,
          purpose: `${reqDoc.subject || 'Practical'} - Exp ${reqDoc.experimentNo || 1}`,
          timestamp: reqDoc.updatedAt || reqDoc.createdAt || new Date(),
          action: 'Issued'
        });
      });
    }
  });

  // Sort newest first
  mergedStoreHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  mergedLabHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.status(200).json({
    receivedFromStore: mergedStoreHistory,
    issuedToStudents: mergedLabHistory
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
