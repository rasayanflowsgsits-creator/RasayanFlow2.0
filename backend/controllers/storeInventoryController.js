const StoreInventory = require('../models/StoreInventory');
const asyncHandler = require('express-async-handler');

const calculateStatus = (qty, reorderLevel) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= (reorderLevel || 2)) return 'Low Stock';
  return 'In Stock';
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
        
        await existing.save();
        updated++;
      } else {
        const availableQty = Number(chem.receivedQty) || 0;
        const reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : 2;
        const status = calculateStatus(availableQty, reorderLevel);
        const totalValue = (chem.unitPrice || 0) * availableQty;

        await StoreInventory.create({
          ...chem,
          chemicalId: chem.chemicalId || `chem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          availableQty,
          status,
          totalValue,
          reorderLevel
        });
        added++;
      }
    } catch (err) {
      console.error(`Error importing chemical ${chem.name || chem.chemicalId}:`, err);
      // Continue to the next row instead of crashing the whole batch
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

  const updates = req.body;
  Object.keys(updates).forEach(key => {
    chemical[key] = updates[key];
  });

  chemical.status = calculateStatus(chemical.availableQty, chemical.reorderLevel);
  chemical.totalValue = (chemical.unitPrice || 0) * (chemical.availableQty || 0);
  chemical.updatedAt = Date.now();

  const updatedChemical = await chemical.save();
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
