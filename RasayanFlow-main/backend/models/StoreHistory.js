const mongoose = require('mongoose');

const storeHistorySchema = new mongoose.Schema({
  type: { type: String, default: 'Store Transfer' },
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
  qtyBeforeUNT: { type: Number },
  qtyAfterUNT: { type: Number },
  qtyBeforeBase: { type: Number },
  qtyRequestedBase: { type: Number },
  qtyAfterBase: { type: Number },
  baseUnit: { type: String },
  unit: { type: String }, // the requested unit (e.g. "500ml")
  quantityBefore: { type: Number }, // legacy alias
  quantityRequested: { type: Number }, // legacy alias
  quantityAfter: { type: Number }, // legacy alias
  unitPrice: { type: Number },
  costPerBase: { type: Number },
  valueBefore: { type: Number },
  valueAfter: { type: Number },
  valueReleased: { type: Number },
  receiptNumber: { type: String },
  action: {
    type: String,
    enum: ["Approved", "Rejected"]
  },
  approvedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreHistory', storeHistorySchema);
