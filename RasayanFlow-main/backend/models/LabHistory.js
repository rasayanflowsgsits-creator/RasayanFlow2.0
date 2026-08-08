const mongoose = require('mongoose');

const chemicalsUsedSchema = new mongoose.Schema({
  chemicalName: { type: String, required: true },
  quantityUsed: { type: Number, required: true },
  unit: { type: String, required: true },
  costPerUnit: { type: Number },
  totalCost: { type: Number }
}, { _id: false });

const labHistorySchema = new mongoose.Schema({
  type: { type: String, required: true, default: 'Student Experiment' },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  labName: { type: String },
  year: { type: String },
  semester: { type: String },
  subject: { type: String },
  experimentNo: { type: Number },
  experimentName: { type: String },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String },
  rollNumber: { type: String },
  group: { type: String },
  chemicalsUsed: { type: [chemicalsUsedSchema], default: [] },
  totalCost: { type: Number, default: 0 },
  approvedBy: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabHistory', labHistorySchema);
