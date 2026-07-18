const mongoose = require('mongoose');

const labRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  studentName: { type: String, required: true },
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab",
    required: true
  },
  labName: { type: String, required: true },
  chemicalName: { type: String, required: true },
  quantityRequested: { type: Number, required: true },
  unit: { type: String, required: true },
  purpose: { type: String },
  groupName: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  rejectedAt: { type: Date },
  rejectionReason: { type: String }
});

module.exports = mongoose.model('LabRequest', labRequestSchema);
