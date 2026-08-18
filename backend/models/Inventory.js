const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  labName: { type: String, trim: true },
  itemCode: { type: String, required: true, trim: true, uppercase: true },
  itemName: { type: String, required: true, trim: true },
  chemicalName: { type: String, required: true, trim: true },
  chemicalId: { type: String, trim: true },
  category: { type: String, required: true, trim: true }, // might overlap with grade
  grade: { type: String, trim: true },
  
  // Refactored quantities as per prompt
  quantityReceived: { type: Number, min: 0, default: 0 },
  quantityAvailable: { type: Number, required: true, min: 0, default: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 }, // fallback alias
  quantityUnit: { type: String, required: true, trim: true },
  
  // Pricing
  costPerBase: { type: Number, min: 0, default: 0 },
  costPerUnit: { type: Number, min: 0, default: 0 }, // fallback alias
  totalValue: { type: Number, min: 0, default: 0 },
  
  minThreshold: { type: Number, required: true, min: 0, default: 0 },
  
  // Tracking
  source: { type: String, trim: true },
  requestId: { type: String, trim: true },
  receivedDate: { type: Date },
  status: { type: String, enum: ["In Stock", "Low Stock", "Out of Stock"], default: "In Stock" },
  isUnlocked: { type: Boolean, default: false },
  
  // Metadata
  casNumber: { type: String, trim: true, default: '' },
  smiles: { type: String, trim: true, default: '' },
  inchi: { type: String, trim: true, default: '' },
  chemicalFormula: { type: String, trim: true, default: '' },
  manufacturingCompany: { type: String, trim: true, default: '' },
  entryDate: { type: Date, default: Date.now },
  storageLocation: { type: String, trim: true, default: '' },
  lotNumber: { type: String, trim: true, default: '' },
  expiryDate: { type: Date, default: null },
  abstract: { type: String, trim: true, default: '' },
  pubmedId: { type: String, trim: true, default: '' },
  
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Calculate totalValue and status before saving
inventorySchema.pre('save', function (next) {
  // Sync quantity and quantityAvailable
  if (this.isModified('quantityAvailable') && !this.isModified('quantity')) {
    this.quantity = this.quantityAvailable;
  } else if (this.isModified('quantity') && !this.isModified('quantityAvailable')) {
    this.quantityAvailable = this.quantity;
  }

  // Sync costPerBase and costPerUnit
  if (this.isModified('costPerBase') && !this.isModified('costPerUnit')) {
    this.costPerUnit = this.costPerBase;
  } else if (this.isModified('costPerUnit') && !this.isModified('costPerBase')) {
    this.costPerBase = this.costPerUnit;
  }

  // Round quantity available and calculate total value
  this.quantityAvailable = Math.round((this.quantityAvailable || 0) * 100) / 100;
  this.quantity = this.quantityAvailable;
  
  this.totalValue = Math.round(this.quantityAvailable * (this.costPerBase || 0) * 100) / 100;

  // Calculate status
  if (this.quantityAvailable <= 0) {
    this.status = 'Out of Stock';
  } else if (this.quantityAvailable <= (this.minThreshold || 0)) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }

  this.lastUpdated = Date.now();
  next();
});

inventorySchema.index({ labId: 1, itemCode: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
