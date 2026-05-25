const mongoose = require('mongoose');

const experimentRequirementSchema = new mongoose.Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    chemicalName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    quantityUnit: { type: String, required: true, trim: true },
    costPerUnit: { type: Number, min: 0, default: 0 },
    estimatedCost: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const experimentSchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  experimentNumber: { type: String, required: true, trim: true },
  experimentObject: { type: String, required: true, trim: true },
  requiredInventory: { type: [experimentRequirementSchema], default: [] },
  totalEstimatedExpense: { type: Number, min: 0, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

experimentSchema.index(
  { labId: 1, experimentNumber: 1 },
  {
    unique: true,
  }
);

module.exports = mongoose.model('Experiment', experimentSchema);
