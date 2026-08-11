const mongoose = require('mongoose');

const requestedChemicalSchema = new mongoose.Schema(
  {
    chemicalName: { type: String, required: true, trim: true },
    quantityRequested: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  },
  { _id: false }
);

const studentRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  group: { type: String, trim: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }, // Optional for M.Pharm/PhD requests that go direct to store
  labName: { type: String, trim: true },
  year: { type: String, trim: true },
  semester: { type: String, trim: true },
  subject: { type: String, trim: true }, // Optional for research requests
  experimentNo: { type: Number }, // Optional for research requests
  experimentName: { type: String, trim: true }, // Optional for research requests
  chemicalsRequested: { type: [requestedChemicalSchema], default: [] },
  overallStatus: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Partial', 'Waiting Store Approval', 'Stock In Lab'], 
    default: 'Pending' 
  },
  storeStatus: {
    type: String,
    enum: ['Not Required', 'Draft', 'Pending Store Approval', 'Approved In Lab', 'Rejected By Store'],
    default: 'Not Required'
  },
  storeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabRequest' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String, trim: true },
});

module.exports = mongoose.model('StudentRequest', studentRequestSchema);
