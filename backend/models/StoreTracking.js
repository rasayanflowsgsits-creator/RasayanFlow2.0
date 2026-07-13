const mongoose = require('mongoose');

const storeTrackingSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  chemicalId: { type: String },
  chemicalName: { type: String, required: true },
  casNumber: { type: String },
  formula: { type: String },
  smiles: { type: String },
  grade: { type: String },
  packSize: { type: String },
  updateType: { type: String }, // e.g., 'Added New', 'Manual Edit', 'Import', 'Bulk Upload'
  previousQty: { type: Number, default: 0 },
  newQty: { type: Number, default: 0 },
  qtyChange: { type: Number, default: 0 },
  previousPrice: { type: Number, default: 0 },
  newPrice: { type: Number, default: 0 },
  totalChemical: { type: String },
  totalPrice: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  status: { type: String },
  snapshot: { type: Object } // Raw copy of the object at that time
});

module.exports = mongoose.model('StoreTracking', storeTrackingSchema);
