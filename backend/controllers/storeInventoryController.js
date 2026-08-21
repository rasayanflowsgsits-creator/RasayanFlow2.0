const StoreInventory = require('../models/StoreInventory');
const StoreTracking = require('../models/StoreTracking');
const asyncHandler = require('express-async-handler');
const { safeRound, parsePackSize, totalStock } = require('../utils/storeHelpers');

const calculateStatus = (qty, reorderLevel) => {
  const q = safeRound(qty);
  if (q <= 0) return 'Out of Stock';
  if (q <= (reorderLevel || 2)) return 'Low Stock';
  return 'In Stock';
};

const createTrackingLog = async ({
  chemical,
  updateType,
  previousQty = 0,
  previousPrice = 0,
  newQty = 0,
  newPrice = 0,
  updatedBy = 'Store Manager'
}) => {
  const pQty = safeRound(previousQty);
  const nQty = safeRound(newQty);
  const pPrice = safeRound(previousPrice || chemical.unitPrice || 0);
  const nPrice = safeRound(newPrice || chemical.unitPrice || 0);
  const uPrice = nPrice || pPrice;

  const packData = parsePackSize(chemical.packSize);
  const totalVolumeNum = safeRound(nQty * packData.baseValue);
  const totalVolumeStr = `${totalVolumeNum.toLocaleString('en-IN')} ${packData.baseUnit}`;
  const totalChemStr = nQty ? `${totalVolumeNum} ${packData.baseUnit}` : '--';

  const totalPriceVal = safeRound(nQty * uPrice);
  const statusVal = calculateStatus(nQty, chemical.reorderLevel);

  const logData = {
    timestamp: new Date(),
    chemicalId: chemical.chemicalId || chemical.itemCode || '',
    chemicalName: chemical.name || chemical.itemName || 'Unknown Chemical',
    casNumber: chemical.cas || chemical.casNumber || '',
    cas: chemical.cas || chemical.casNumber || '',
    formula: chemical.formula || chemical.molecularFormula || '',
    smiles: chemical.smiles || '',
    grade: chemical.grade || 'LR',
    packSize: chemical.packSize || '',
    updateType: updateType || 'Manual Edit',
    previousQty: pQty,
    newQty: nQty,
    qtyChange: safeRound(nQty - pQty),
    previousPrice: pPrice,
    newPrice: nPrice,
    unitPrice: uPrice,
    totalChemical: totalChemStr,
    totalVolume: totalVolumeStr,
    totalPrice: totalPriceVal,
    totalValue: totalPriceVal,
    status: statusVal,
    updatedBy: updatedBy || 'Store Manager',
    snapshot: typeof chemical.toObject === 'function' ? chemical.toObject() : chemical
  };

  return await StoreTracking.create(logData);
};

const getAllChemicals = asyncHandler(async (req, res) => {
  const chemicals = await StoreInventory.find({}).sort({ name: 1 });
  res.status(200).json(chemicals);
});

const importChemicals = asyncHandler(async (req, res) => {
  const isObjectPayload = !Array.isArray(req.body) && req.body.chemicals;
  const chemicals = isObjectPayload ? req.body.chemicals : req.body;
  const importMode = isObjectPayload ? req.body.importMode : 'merge';

  if (!Array.isArray(chemicals)) {
    res.status(400);
    throw new Error('Invalid data format. Expected an array of chemicals.');
  }

  let added = 0;
  let updated = 0;
  const userName = req.user?.name || 'Store Manager';

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
        existing.unitPrice = chem.unitPrice !== undefined ? Number(chem.unitPrice) : existing.unitPrice;
        existing.purchasePrice = chem.purchasePrice !== undefined ? Number(chem.purchasePrice) : existing.purchasePrice;
        existing.pricePerUnit = chem.pricePerUnit !== undefined ? Number(chem.pricePerUnit) : existing.pricePerUnit;
        
        const newReceived = Number(chem.receivedQty !== undefined ? chem.receivedQty : chem.availableQty) || 0;
        
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

        const updateType = importMode === 'replace' ? 'Bulk Import' : 'Stock Replenishment';
        await createTrackingLog({
          chemical: saved,
          updateType,
          previousQty,
          previousPrice,
          newQty: saved.availableQty,
          newPrice: saved.unitPrice,
          updatedBy: userName
        });
      } else {
        const newReceived = Number(chem.receivedQty !== undefined ? chem.receivedQty : chem.availableQty) || 0;
        const availableQty = safeRound(newReceived);
        const reorderLevel = chem.reorderLevel !== undefined ? chem.reorderLevel : 2;
        const status = calculateStatus(availableQty, reorderLevel);
        const uPrice = Number(chem.unitPrice || 0);
        const totalValue = safeRound(uPrice * availableQty);

        const newChem = await StoreInventory.create({
          ...chem,
          chemicalId: chem.chemicalId || `CHEM-${Date.now().toString().slice(-6)}`,
          receivedQty: availableQty,
          availableQty,
          unitPrice: uPrice,
          status,
          totalValue,
          reorderLevel
        });
        added++;

        await createTrackingLog({
          chemical: newChem,
          updateType: 'Bulk Import',
          previousQty: 0,
          previousPrice: 0,
          newQty: newChem.availableQty,
          newPrice: newChem.unitPrice,
          updatedBy: userName
        });
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
  const userName = req.user?.name || 'Store Manager';

  const updates = req.body;
  Object.keys(updates).forEach(key => {
    chemical[key] = updates[key];
  });

  if (updates.availableQty !== undefined) {
    chemical.availableQty = safeRound(updates.availableQty);
  }

  chemical.status = calculateStatus(chemical.availableQty, chemical.reorderLevel);
  chemical.totalValue = safeRound((chemical.unitPrice || 0) * (chemical.availableQty || 0));
  chemical.updatedAt = Date.now();

  const updatedChemical = await chemical.save();
  
  await createTrackingLog({
    chemical: updatedChemical,
    updateType: 'Manual Edit',
    previousQty,
    previousPrice,
    newQty: updatedChemical.availableQty,
    newPrice: updatedChemical.unitPrice,
    updatedBy: userName
  });

  res.status(200).json(updatedChemical);
});

const deleteChemical = asyncHandler(async (req, res) => {
  const chemical = await StoreInventory.findById(req.params.id);

  if (!chemical) {
    res.status(404);
    throw new Error('Chemical not found');
  }

  const previousQty = chemical.availableQty || 0;
  const previousPrice = chemical.unitPrice || 0;
  const userName = req.user?.name || 'Store Manager';

  // Log final state before deletion
  await createTrackingLog({
    chemical,
    updateType: 'Deleted',
    previousQty,
    previousPrice,
    newQty: 0,
    newPrice: previousPrice,
    updatedBy: userName
  });

  await StoreInventory.deleteOne({ _id: chemical._id });
  res.status(200).json({ id: req.params.id });
});

const addSingleChemical = asyncHandler(async (req, res) => {
  const { chemicalId, name, cas, quantity, quantityUnit, packSize, unitPrice, storageLocation, grade, supplier } = req.body;
  const cleanName = (name || '').trim();
  const cleanCode = (chemicalId || '').trim();
  const addQty = Number(quantity) || 0;
  const userName = req.user?.name || 'Store Manager';

  const orConditions = [];
  if (cleanCode) orConditions.push({ chemicalId: cleanCode });
  if (cleanName) {
    orConditions.push({ name: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  }
  if (cas) orConditions.push({ cas: cas.trim() });

  let existing = null;
  if (orConditions.length > 0) {
    existing = await StoreInventory.findOne({ $or: orConditions });
  }

  if (existing) {
    const previousQty = existing.availableQty || 0;
    const previousPrice = existing.unitPrice || 0;

    existing.availableQty = safeRound((existing.availableQty || 0) + addQty);
    existing.receivedQty = safeRound((existing.receivedQty || 0) + addQty);
    if (storageLocation) existing.storageLocation = storageLocation.trim();
    if (unitPrice) existing.unitPrice = Number(unitPrice);

    existing.status = calculateStatus(existing.availableQty, existing.reorderLevel);
    existing.totalValue = safeRound((existing.unitPrice || 0) * existing.availableQty);
    existing.updatedAt = Date.now();

    const saved = await existing.save();
    
    await createTrackingLog({
      chemical: saved,
      updateType: 'Stock Replenishment',
      previousQty,
      previousPrice,
      newQty: saved.availableQty,
      newPrice: saved.unitPrice,
      updatedBy: userName
    });

    return res.status(200).json({
      success: true,
      data: saved,
      restocked: true,
      message: `Added +${addQty} to existing chemical ${saved.name} (ID: ${saved.chemicalId}). Total available: ${saved.availableQty}`
    });
  }

  const newQty = safeRound(addQty);
  const reorderLevel = req.body.reorderLevel || 2;
  const status = calculateStatus(newQty, reorderLevel);
  const uPrice = Number(unitPrice) || 0;

  const newChem = await StoreInventory.create({
    chemicalId: cleanCode || `CHEM-${Date.now().toString().slice(-6)}`,
    name: cleanName,
    cas: cas || '',
    grade: grade || 'LR',
    packSize: packSize || `${addQty}${quantityUnit || 'g'}`,
    unit: quantityUnit || 'g',
    unitPrice: uPrice,
    receivedQty: newQty,
    availableQty: newQty,
    storageLocation: storageLocation || '',
    supplier: supplier || '',
    status,
    totalValue: safeRound(uPrice * newQty),
    reorderLevel
  });

  await createTrackingLog({
    chemical: newChem,
    updateType: 'Initial Import',
    previousQty: 0,
    previousPrice: 0,
    newQty: newChem.availableQty,
    newPrice: newChem.unitPrice,
    updatedBy: userName
  });

  res.status(201).json({
    success: true,
    data: newChem,
    restocked: false,
    message: `Added new chemical ${newChem.name} (ID: ${newChem.chemicalId}) with ${newChem.availableQty} ${newChem.unit}`
  });
});

module.exports = {
  getAllChemicals,
  importChemicals,
  addSingleChemical,
  updateChemical,
  deleteChemical,
  createTrackingLog
};
