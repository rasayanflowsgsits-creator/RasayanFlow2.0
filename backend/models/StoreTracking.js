const mongoose = require('mongoose');

const storeTrackingSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  chemicalId: { type: String, default: '' },
  chemicalName: { type: String, required: true },
  casNumber: { type: String, default: '' },
  cas: { type: String, default: '' },
  formula: { type: String, default: '' },
  smiles: { type: String, default: '' },
  grade: { type: String, default: 'LR' },
  packSize: { type: String, default: '' },
  updateType: { type: String, default: 'Manual Edit' }, // Bulk Import, Lab Transfer, Manual Edit, Stock Replenishment, Initial Import, Deleted
  previousQty: { type: Number, default: 0 },
  newQty: { type: Number, default: 0 },
  qtyChange: { type: Number, default: 0 },
  previousPrice: { type: Number, default: 0 },
  newPrice: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  totalChemical: { type: String, default: '' },
  totalVolume: { type: String, default: '' },
  totalPrice: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  status: { type: String, default: 'In Stock' },
  updatedBy: { type: String, default: 'Store Manager' },
  snapshot: { type: Object }
});

module.exports = mongoose.model('StoreTracking', storeTrackingSchema);
