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

  const history = await StoreHistory.find(filter)
    .sort({ timestamp: -1 })
    .populate('labId', 'name labName labCode');
    
  res.status(200).json(history);
});

module.exports = { getHistory };
