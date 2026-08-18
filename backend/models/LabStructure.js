const mongoose = require('mongoose');

const chemicalRequirementSchema = new mongoose.Schema(
  {
    chemicalName: { type: String, required: true, trim: true },
    quantityPerStudent: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    isUnlocked: { type: Boolean, default: false }
  },
  { _id: false }
);

const labStructureSchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  labName: { type: String, trim: true },
  courseType: { type: String, trim: true },
  year: { type: String, trim: true },
  semester: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  experimentNo: { type: Number, required: true, min: 1 },
  experimentName: { type: String, required: true, trim: true },
  chemicals: { type: [chemicalRequirementSchema], default: [] },
  isUnlocked: { type: Boolean, default: false },
  unlockedAt: { type: Date, default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Ensure uniqueness per subject and experiment number within a lab
labStructureSchema.index(
  { labId: 1, subject: 1, experimentNo: 1 },
  { unique: true }
);

module.exports = mongoose.model('LabStructure', labStructureSchema);
