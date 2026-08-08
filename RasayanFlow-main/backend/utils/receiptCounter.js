const Counter = require('../models/Counter');

const getNextReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `receipt_${year}`;
  
  const counter = await Counter.findByIdAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  return `RF-${year}-${counter.seq}`;
};

module.exports = { getNextReceiptNumber };
