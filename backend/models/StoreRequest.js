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
  labName: { type: String, default: "PhD Research Scholar" },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  studentName: { type: String },
  chemicalName: { type: String, required: true },
  chemicalId: { type: String },
  casNumber: { type: String },
  quantityRequested: { type: Number, required: true },
  unit: { type: String, required: true },
  reason: { type: String },
  projectThesisName: { type: String },
  supervisorName: { type: String },
  requestType: {
    type: String,
    enum: ["Lab Requisition", "PhD Research", "Higher Scholar"],
    default: "Lab Requisition"
  },
  course: { type: String, default: "PhD" },
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
