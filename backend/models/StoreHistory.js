const mongoose = require('mongoose');

const storeHistorySchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StoreRequest"
  },
  chemicalName: { type: String },
  chemicalId: { type: String },
  labName: { type: String },
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab"
  },
  quantityBefore: { type: Number },
  quantityRequested: { type: Number },
  quantityAfter: { type: Number },
  unit: { type: String },
  unitPrice: { type: Number },
  valueBefore: { type: Number },
  valueAfter: { type: Number },
  receiptNumber: { type: String },
  action: {
    type: String,
    enum: ["Approved", "Rejected"]
  },
  approvedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreHistory', storeHistorySchema);
