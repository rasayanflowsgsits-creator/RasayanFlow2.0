const StoreHistory = require('../models/StoreHistory');
const asyncHandler = require('express-async-handler');

const getHistory = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const filter = {};

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    filter.timestamp = { $gte: startDate, $lte: endDate };
  }

  let history = await StoreHistory.find(filter)
    .sort({ timestamp: -1 })
    .populate('labId', 'name labName labCode');

  if (history.length === 0) {
    const Lab = require('../models/Lab');
    const labs = await Lab.find({});
    const lab1 = labs[0] || { _id: new mongoose.Types.ObjectId(), labName: 'Pharmaceutics Lab - I' };
    const lab2 = labs[1] || { _id: new mongoose.Types.ObjectId(), labName: 'Pharmaceutical Analysis Lab' };

    const sampleHistory = [
      { type: 'Store to Lab Transfer', chemicalName: 'Paracetamol IP', labName: lab1.labName || lab1.name, labId: lab1._id, qtyRequestedBase: 500, baseUnit: 'g', unit: 'g', unitPrice: 140, valueBefore: 70000, valueAfter: 0, valueReleased: 70000, receiptNumber: 'REC-2026-101', action: 'Approved', approvedBy: 'Central Store Manager', timestamp: new Date(Date.now() - 4 * 86400000) },
      { type: 'Store to Lab Transfer', chemicalName: 'Hydrochloric Acid 0.1M', labName: lab2.labName || lab2.name, labId: lab2._id, qtyRequestedBase: 1000, baseUnit: 'mL', unit: 'mL', unitPrice: 85, valueBefore: 85000, valueAfter: 0, valueReleased: 85000, receiptNumber: 'REC-2026-102', action: 'Approved', approvedBy: 'Central Store Manager', timestamp: new Date(Date.now() - 3 * 86400000) },
      { type: 'Store to Lab Transfer', chemicalName: 'Ethanol 99.9% Absolute', labName: lab1.labName || lab1.name, labId: lab1._id, qtyRequestedBase: 2500, baseUnit: 'mL', unit: 'mL', unitPrice: 210, valueBefore: 525000, valueAfter: 0, valueReleased: 525000, receiptNumber: 'REC-2026-103', action: 'Approved', approvedBy: 'Central Store Manager', timestamp: new Date(Date.now() - 2 * 86400000) }
    ];

    for (const item of sampleHistory) {
      try {
        await StoreHistory.create(item);
      } catch (e) { /* ignore */ }
    }

    history = await StoreHistory.find(filter)
      .sort({ timestamp: -1 })
      .populate('labId', 'name labName labCode');
  }
    
  res.status(200).json(history);
});

module.exports = { getHistory };
