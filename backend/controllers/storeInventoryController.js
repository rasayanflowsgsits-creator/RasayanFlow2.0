const StoreInventory = require('../models/StoreInventory');
const StoreTracking = require('../models/StoreTracking');
const asyncHandler = require('express-async-handler');

const { safeRound, totalStock } = require('../utils/storeHelpers');

const calculateStatus = (qty, reorderLevel) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= (reorderLevel || 2)) return 'Low Stock';
  return 'In Stock';
};

const createTrackingLog = async (chemical, updateType, previousQty, previousPrice, newQty, newPrice) => {
  const stockData = totalStock(newQty, chemical.packSize);
  const totalChemStr = newQty ? `${stockData.total} ${stockData.unit}` : '--';

  await StoreTracking.create({
    chemicalId: chemical.chemicalId,
    chemicalName: chemical.name,
    casNumber: chemical.cas || '',
    formula: chemical.formula || '',
    smiles: chemical.smiles || '',
    grade: chemical.grade || '',
    packSize: chemical.packSize || '',
    updateType,
    previousQty: safeRound(previousQty),
    newQty: safeRound(newQty),
    qtyChange: safeRound(newQty - previousQty),
    previousPrice: safeRound(previousPrice),
    newPrice: safeRound(newPrice),
    totalChemical: totalChemStr,
    totalPrice: safeRound(newQty * newPrice),
    totalValue: safeRound(newQty * newPrice),
    status: calculateStatus(newQty, chemical.reorderLevel),
    snapshot: chemical
  });
};

const getAllChemicals = asyncHandler(async (req, res) => {
  const chemicals = await StoreInventory.find({}).sort({ name: 1 });
  res.status(200).json(chemicals);
});

const importChemicals = asyncHandler(async (req, res) => {
  // Support both direct array (legacy) and object payload
  const isObjectPayload = !Array.isArray(req.body) && req.body.chemicals;
  const chemicals = isObjectPayload ? req.body.chemicals : req.body;
  const importMode = isObjectPayload ? req.body.importMode : 'merge';

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
      if (chem.name) {
        const cleanName = chem.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        orConditions.push({ name: new RegExp('^' + cleanName + '$', 'i') });
      }

      const existing = await StoreInventory.findOne({ $or: orConditions });

      if (existing) {
        const previousQty = existing.availableQty || 0;
        const previousPrice = existing.unitPrice || 0;

        existing.packSize = chem.packSize || existing.packSize;
        existing.unitPrice = chem.unitPrice || existing.unitPrice;
        existing.purchasePrice = chem.purchasePrice || existing.purchasePrice;
        existing.pricePerUnit = chem.pricePerUnit || existing.pricePerUnit;
        
        const newReceived = Number(chem.receivedQty !== undefined ? chem.receivedQty : chem.availableQty) || 0;
        
        // Handle Replace vs Merge logic
        if (importMode === 'replace') {
          existing.receivedQty = safeRound(newReceived);
          existing.availableQty = safeRound(newReceived);
        } else {
          existing.receivedQty = safeRound((existing.receivedQty || 0) + newReceived);
          existing.availableQty = safeRound((existing.availableQty || 0) + newReceived);
        }

        existing.reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : (existing.reorderLevel || 2);
        existing.grade = chem.grade || existing.grade;
        existing.cas = chem.cas || existing.cas;
        existing.formula = chem.formula || existing.formula;
        existing.smiles = chem.smiles || existing.smiles;
        existing.supplier = chem.supplier || existing.supplier;
        
        existing.status = calculateStatus(existing.availableQty, existing.reorderLevel);
        existing.totalValue = safeRound((existing.unitPrice || 0) * existing.availableQty);
        existing.updatedAt = Date.now();
        
        const saved = await existing.save();
        updated++;

        await createTrackingLog(saved, importMode === 'replace' ? 'Import (Replace)' : 'Import (Merge)', previousQty, previousPrice, saved.availableQty, saved.unitPrice);
      } else {
        const newReceived = Number(chem.receivedQty !== undefined ? chem.receivedQty : chem.availableQty) || 0;
        const availableQty = safeRound(newReceived);
        const reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : 2;
        const status = calculateStatus(availableQty, reorderLevel);
        const totalValue = safeRound((chem.unitPrice || 0) * availableQty);

        const newChem = await StoreInventory.create({
          ...chem,
          chemicalId: chem.chemicalId || `chem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          receivedQty: availableQty,
          availableQty,
          status,
          totalValue,
          reorderLevel
        });
        added++;

        await createTrackingLog(newChem, newReceived ? 'Bulk Upload' : 'Added New', 0, 0, newChem.availableQty, newChem.unitPrice);
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
  chemical.totalValue = safeRound((chemical.unitPrice || 0) * (chemical.availableQty || 0));
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
