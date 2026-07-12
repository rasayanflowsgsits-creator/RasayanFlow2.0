const mongoose = require('mongoose');

const storeRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab"
  },
  labName: { type: String, required: true },
  chemicalName: { type: String, required: true },
  chemicalId: { type: String },
  casNumber: { type: String },
  quantityRequested: { type: Number, required: true },
  unit: { type: String, required: true },
  reason: { type: String },
  requiredBy: { type: Date },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  receiptNumber: { type: String },
  requestedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreRequest', storeRequestSchema);
