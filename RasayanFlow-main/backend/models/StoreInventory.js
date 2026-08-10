const mongoose = require('mongoose');

const storeInventorySchema = new mongoose.Schema({
  chemicalId: { type: String, unique: true },
  name: { type: String, required: true },
  cas: { type: String },
  synonyms: { type: String },
  smiles: { type: String },
  pubchemUrl: { type: String },
  formula: { type: String },
  molecularWeight: { type: String },
  inchiKey: { type: String },
  supplier: { type: String },
  batchNumber: { type: String },
  invoiceNumber: { type: String },
  grade: {
    type: String
  },
  packSize: { type: String },
  unit: { type: String },
  purchasePrice: { type: Number },
  unitPrice: { type: Number },
  pricePerUnit: { type: Number },
  receivedQty: { type: Number },
  availableQty: { type: Number },
  hazard: { type: String },
  safety: { type: String },
  reorderLevel: { type: Number, default: 2 },
  status: {
    type: String,
    enum: ["In Stock", "Low Stock", "Out of Stock"],
    default: "In Stock"
  },
  totalValue: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreInventory', storeInventorySchema);
