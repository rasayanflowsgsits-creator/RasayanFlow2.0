const mongoose = require('mongoose');

const labHistorySchema = new mongoose.Schema({
  type: { type: String, default: 'Lab to Student Transfer' },
  chemicalName: { type: String },
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab"
  },
  labName: { type: String },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  studentName: { type: String },
  groupName: { type: String },
  qtyBefore: { type: Number },
  qtyRequested: { type: Number },
  qtyAfter: { type: Number },
  unit: { type: String },
  costPerBase: { type: Number },
  valueBefore: { type: Number },
  valueAfter: { type: Number },
  valueUsed: { type: Number },
  purpose: { type: String },
  action: {
    type: String,
    enum: ["Approved", "Rejected"]
  },
  approvedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabHistory', labHistorySchema);
