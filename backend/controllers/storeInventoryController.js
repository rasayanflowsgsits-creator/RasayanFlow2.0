const StoreInventory = require('../models/StoreInventory');
const StoreTracking = require('../models/StoreTracking');
const asyncHandler = require('express-async-handler');

const calculateStatus = (qty, reorderLevel) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= (reorderLevel || 2)) return 'Low Stock';
  return 'In Stock';
};

const createTrackingLog = async (chemical, updateType, previousQty, previousPrice, newQty, newPrice) => {
  const calcTotalChemical = (qty, packSizeStr) => {
    if (!packSizeStr) return '--';
    const str = String(packSizeStr).trim();
    if (str.toUpperCase().includes('UNT')) return str;
    const match = str.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      const num = Number(match[1]);
      const unit = match[2].trim();
      if (!isNaN(num)) return `${qty * num} ${unit}`;
    }
    return str;
  };

  await StoreTracking.create({
    chemicalId: chemical.chemicalId,
    chemicalName: chemical.name,
    casNumber: chemical.cas || '',
    formula: chemical.formula || '',
    smiles: chemical.smiles || '',
    grade: chemical.grade || '',
    packSize: chemical.packSize || '',
    updateType,
    previousQty,
    newQty,
    qtyChange: newQty - previousQty,
    previousPrice,
    newPrice,
    totalChemical: calcTotalChemical(newQty, chemical.packSize),
    totalPrice: newQty * newPrice,
    totalValue: newQty * newPrice,
    status: calculateStatus(newQty, chemical.reorderLevel),
    snapshot: chemical
  });
};

const getAllChemicals = asyncHandler(async (req, res) => {
  const chemicals = await StoreInventory.find({}).sort({ name: 1 });
  res.status(200).json(chemicals);
});

const importChemicals = asyncHandler(async (req, res) => {
  const chemicals = req.body;
  if (!Array.isArray(chemicals)) {
    res.status(400);
    throw new Error('Invalid data format. Expected an array of chemicals.');
  }

  let added = 0;
  let updated = 0;

  for (const chem of chemicals) {
    if (!chem.chemicalId && !chem.name) continue;

    try {
      const orConditions = [];
      if (chem.chemicalId) orConditions.push({ chemicalId: chem.chemicalId });
      if (chem.name) orConditions.push({ name: chem.name });

      const existing = await StoreInventory.findOne({ $or: orConditions });

      if (existing) {
        const previousQty = existing.availableQty || 0;
        const previousPrice = existing.unitPrice || 0;

        existing.packSize = chem.packSize || existing.packSize;
        existing.unitPrice = chem.unitPrice || existing.unitPrice;
        existing.purchasePrice = chem.purchasePrice || existing.purchasePrice;
        const newReceived = Number(chem.receivedQty) || 0;
        existing.receivedQty = (existing.receivedQty || 0) + newReceived;
        existing.availableQty = (existing.availableQty || 0) + newReceived;
        existing.reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : existing.reorderLevel;
        existing.grade = chem.grade || existing.grade;
        
        existing.status = calculateStatus(existing.availableQty, existing.reorderLevel);
        existing.totalValue = existing.unitPrice * existing.availableQty;
        existing.updatedAt = Date.now();
        
        const saved = await existing.save();
        updated++;

        await createTrackingLog(saved, chem.receivedQty ? 'Import' : 'Manual Edit', previousQty, previousPrice, saved.availableQty, saved.unitPrice);
      } else {
        const availableQty = Number(chem.receivedQty) || 0;
        const reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : 2;
        const status = calculateStatus(availableQty, reorderLevel);
        const totalValue = (chem.unitPrice || 0) * availableQty;

        const newChem = await StoreInventory.create({
          ...chem,
          chemicalId: chem.chemicalId || `chem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          availableQty,
          status,
          totalValue,
          reorderLevel
        });
        added++;

        await createTrackingLog(newChem, chem.receivedQty ? 'Bulk Upload' : 'Added New', 0, 0, newChem.availableQty, newChem.unitPrice);
      }
    } catch (err) {
      console.error(`Error importing chemical ${chem.name || chem.chemicalId}:`, err);
    }
  }

  res.status(200).json({ added, updated });
});

const updateChemical = asyncHandler(async (req, res) => {
  const chemical = await StoreInventory.findById(req.params.id);

  if (!chemical) {
    res.status(404);
    throw new Error('Chemical not found');
  }

  const previousQty = chemical.availableQty || 0;
  const previousPrice = chemical.unitPrice || 0;

  const updates = req.body;
  Object.keys(updates).forEach(key => {
    chemical[key] = updates[key];
  });

  chemical.status = calculateStatus(chemical.availableQty, chemical.reorderLevel);
  chemical.totalValue = (chemical.unitPrice || 0) * (chemical.availableQty || 0);
  chemical.updatedAt = Date.now();

  const updatedChemical = await chemical.save();
  
  await createTrackingLog(updatedChemical, 'Manual Edit', previousQty, previousPrice, updatedChemical.availableQty, updatedChemical.unitPrice);

  res.status(200).json(updatedChemical);
});

const deleteChemical = asyncHandler(async (req, res) => {
  const chemical = await StoreInventory.findById(req.params.id);

  if (!chemical) {
    res.status(404);
    throw new Error('Chemical not found');
  }

  await StoreInventory.deleteOne({ _id: chemical._id });
  res.status(200).json({ id: req.params.id });
});

module.exports = {
  getAllChemicals,
  importChemicals,
  updateChemical,
  deleteChemical
};
