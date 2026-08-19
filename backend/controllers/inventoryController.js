const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');
const { getChemicalAbstract } = require('../utils/pubmedService');
const { fetchChemicalDataByCas, fetchChemicalDataByQuery } = require('../utils/pubchemService');
const { decorateInventoryAbstract } = require('../utils/abstractFallbackService');

const buildGeneratedCode = (chemicalName, casNumber = '', manufacturingCompany = '') => {
  const chemicalChunk = String(chemicalName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  const casChunk = String(casNumber || '')
    .replace(/[^0-9]/g, '')
    .slice(-4);
  const companyChunk = String(manufacturingCompany || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const stamp = Date.now().toString().slice(-4);
  return `${chemicalChunk || 'CHEM'}${casChunk || '0000'}${companyChunk || 'GEN'}${stamp}`;
};

const assertLabAdminAccess = (req, res, ownerLabId) => {
  if (req.user.role !== 'labAdmin') return;

  if (!req.user.labId || String(ownerLabId) !== String(req.user.labId)) {
    res.status(403);
    throw new Error('Forbidden: lab admins can only access inventory in their assigned lab');
  }
};

const buildInventorySnapshot = (item) => ({
  itemCode: item.itemCode,
  itemName: item.itemName,
  chemicalName: item.chemicalName,
  category: item.category,
  quantity: item.quantity,
  quantityUnit: item.quantityUnit,
  costPerUnit: item.costPerUnit,
  minThreshold: item.minThreshold,
  casNumber: item.casNumber || '',
  smiles: item.smiles || '',
  inchi: item.inchi || '',
  chemicalFormula: item.chemicalFormula || '',
  manufacturingCompany: item.manufacturingCompany || '',
  entryDate: item.entryDate || null,
  storageLocation: item.storageLocation || '',
  lotNumber: item.lotNumber || '',
  expiryDate: item.expiryDate || null,
  abstract: item.abstract || '',
  pubmedId: item.pubmedId || '',
  labId: item.labId,
});

const createAuditEntry = ({ userId, action, details, entityType = 'inventory', entityId = null, metadata = null }) =>
  ActivityLog.create({
    userId,
    action,
    details,
    entityType,
    entityId,
    metadata,
  });

const createInventory = asyncHandler(async (req, res) => {
  const {
    labId,
    itemCode,
    itemName,
    chemicalName,
    category,
    quantity,
    quantityUnit,
    costPerUnit,
    minThreshold,
    casNumber,
    smiles,
    inchi,
    chemicalFormula,
    manufacturingCompany,
    entryDate,
    storageLocation,
    lotNumber,
    expiryDate,
    abstract,
    pubmedId,
  } = req.body;

  const resolvedChemicalName = chemicalName || itemName;

  if (!labId || !resolvedChemicalName || !category || quantity == null || !quantityUnit || minThreshold == null) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  assertLabAdminAccess(req, res, labId);

  const normalizedCode = (itemCode?.trim().toUpperCase() || buildGeneratedCode(resolvedChemicalName, casNumber, manufacturingCompany));
  const existingItem = await Inventory.findOne({ labId, itemCode: normalizedCode });
  if (existingItem) {
    res.status(409);
    throw new Error('This item is already listed.');
  }

  const item = await Inventory.create({
    labId,
    itemCode: normalizedCode,
    itemName: resolvedChemicalName.trim(),
    chemicalName: resolvedChemicalName.trim(),
    category: category.trim(),
    quantity,
    quantityUnit: quantityUnit.trim(),
    costPerUnit: Number(costPerUnit || 0),
    minThreshold,
    casNumber: casNumber?.trim() || '',
    smiles: smiles?.trim() || '',
    inchi: inchi?.trim() || '',
    chemicalFormula: chemicalFormula?.trim() || '',
    manufacturingCompany: manufacturingCompany?.trim() || '',
    entryDate: entryDate || new Date(),
    storageLocation: storageLocation?.trim() || '',
    lotNumber: lotNumber?.trim() || '',
    expiryDate: expiryDate || null,
    abstract: abstract?.trim() || '',
    pubmedId: pubmedId?.trim() || '',
    lastUpdated: new Date()
  });

  await createAuditEntry({
    userId: req.user._id,
    action: 'create_item',
    details: `Created item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { after: buildInventorySnapshot(item) },
  });
  getIo().emit('inventory.updated', { action: 'created', item });

  res.status(201).json({ success: true, data: decorateInventoryAbstract(item) });
});

const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  if (updates.quantity != null && updates.quantity < 0) {
    res.status(400);
    throw new Error('Quantity cannot be negative');
  }

  const before = buildInventorySnapshot(item);

  if (updates.itemCode != null) {
    updates.itemCode = String(updates.itemCode).trim().toUpperCase();
    const duplicateItem = await Inventory.findOne({
      _id: { $ne: id },
      labId: item.labId,
      itemCode: updates.itemCode,
    });

    if (duplicateItem) {
      res.status(409);
      throw new Error('This item is already listed.');
    }
  }

  if (updates.itemName != null) updates.itemName = String(updates.itemName).trim();
  if (updates.chemicalName != null) {
    updates.chemicalName = String(updates.chemicalName).trim();
    updates.itemName = updates.chemicalName;
  }
  if (updates.category != null) updates.category = String(updates.category).trim();
  if (updates.quantityUnit != null) updates.quantityUnit = String(updates.quantityUnit).trim();
  if (updates.costPerUnit != null) updates.costPerUnit = Number(updates.costPerUnit);
  if (updates.casNumber != null) updates.casNumber = String(updates.casNumber).trim();
  if (updates.smiles != null) updates.smiles = String(updates.smiles).trim();
  if (updates.inchi != null) updates.inchi = String(updates.inchi).trim();
  if (updates.chemicalFormula != null) updates.chemicalFormula = String(updates.chemicalFormula).trim();
  if (updates.manufacturingCompany != null) updates.manufacturingCompany = String(updates.manufacturingCompany).trim();
  if (updates.storageLocation != null) updates.storageLocation = String(updates.storageLocation).trim();
  if (updates.lotNumber != null) updates.lotNumber = String(updates.lotNumber).trim();
  if (updates.abstract != null) updates.abstract = String(updates.abstract).trim();
  if (updates.pubmedId != null) updates.pubmedId = String(updates.pubmedId).trim();
  if (Object.prototype.hasOwnProperty.call(updates, 'entryDate') && !updates.entryDate) {
    updates.entryDate = null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'expiryDate') && !updates.expiryDate) {
    updates.expiryDate = null;
  }

  Object.assign(item, updates);
  item.lastUpdated = new Date();
  await item.save();

  await createAuditEntry({
    userId: req.user._id,
    action: 'update_item',
    details: `Updated item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before, after: buildInventorySnapshot(item) },
  });
  getIo().emit('inventory.updated', { action: 'updated', item });

  res.json({ success: true, data: decorateInventoryAbstract(item) });
});

const deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Inventory.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  const snapshot = buildInventorySnapshot(item);
  await item.deleteOne();

  await createAuditEntry({
    userId: req.user._id,
    action: 'delete_item',
    details: `Deleted item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before: snapshot },
  });
  getIo().emit('inventory.updated', { action: 'deleted', itemId: id });

  res.json({ success: true, message: 'Item deleted' });
});

const getInventory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, itemName = '', labId } = req.query;

  const criteria = {};
  if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
    if (labId && String(labId) !== String(req.user.labId)) {
      res.status(403);
      throw new Error('Forbidden: lab admins can only query inventory for their assigned lab');
    }
  } else if (labId) {
    criteria.labId = labId;
  }
  if (itemName) {
    criteria.$or = [
      { itemName: { $regex: itemName, $options: 'i' } },
      { chemicalName: { $regex: itemName, $options: 'i' } },
      { itemCode: { $regex: itemName, $options: 'i' } },
      { casNumber: { $regex: itemName, $options: 'i' } },
      { chemicalFormula: { $regex: itemName, $options: 'i' } },
    ];
  }

  const total = await Inventory.countDocuments(criteria);
  const items = await Inventory.find(criteria)
    .populate('labId', 'labName labCode')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ lastUpdated: -1 });

  const decoratedItems = items.map((entry) => decorateInventoryAbstract(entry));
  res.json({ success: true, data: decoratedItems, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const getInventoryById = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  assertLabAdminAccess(req, res, item.labId);

  res.json({ success: true, data: decorateInventoryAbstract(item) });
});

const fetchChemicalAbstractForInventory = asyncHandler(async (req, res) => {
  const { chemicalName, inventoryItemId } = req.body;

  if (!chemicalName || chemicalName.trim().length === 0) {
    res.status(400);
    throw new Error('Chemical name is required');
  }

  try {
    const abstractData = await getChemicalAbstract(chemicalName.trim());

    // If inventoryItemId is provided, update the item with the fetched abstract
    if (inventoryItemId && abstractData.source === 'pubmed') {
      const item = await Inventory.findById(inventoryItemId);
      if (item) {
        assertLabAdminAccess(req, res, item.labId);
        item.abstract = abstractData.abstract;
        item.pubmedId = abstractData.pmid;
        item.lastUpdated = new Date();
        await item.save();

        await createAuditEntry({
          userId: req.user._id,
          action: 'update_abstract',
          details: `Updated abstract for ${item.itemName} from PubMed`,
          entityId: item._id,
          metadata: { pmid: abstractData.pmid, source: 'pubmed' },
        });

        getIo().emit('inventory.updated', { action: 'updated', item });
      }
    }

    res.json({
      success: true,
      data: abstractData,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Failed to fetch abstract: ${error.message}`);
  }
});

const fetchChemicalDataForInventory = asyncHandler(async (req, res) => {
  const { casNumber, query, chemicalName } = req.body;
  const searchTerm = query || casNumber || chemicalName;

  if (!searchTerm || searchTerm.trim().length === 0) {
    res.status(400);
    throw new Error('Chemical Name, CAS number, or PubChem CID is required');
  }

  const chemicalData = await fetchChemicalDataByQuery(searchTerm.trim());
  res.json({ success: true, data: chemicalData });
});

const bulkImportInventory = asyncHandler(async (req, res) => {
  // Support both direct payload array and { labId, items, importMode } payload
  const isObjectPayload = !Array.isArray(req.body) && req.body.items;
  const labId = isObjectPayload ? req.body.labId : req.body.labId; // Note: Even in old format, labId and items were inside req.body
  const items = isObjectPayload ? req.body.items : req.body.items;
  const importMode = isObjectPayload ? req.body.importMode || 'merge' : 'merge';

  if (!labId) {
    res.status(400);
    throw new Error('labId is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('items must be a non-empty array');
  }

  assertLabAdminAccess(req, res, labId);

  const parseOptionalDate = (value, fallback = null) => {
    if (value == null) return fallback;
    const text = String(value).trim();
    if (!text) return fallback;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  };

  const normalizedItems = items.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? raw : {};
    const chemicalName = String(row.chemicalName || row.itemName || '').trim();
    const category = String(row.category || 'Chemical').trim() || 'Chemical';
    const quantityUnit = String(row.quantityUnit || '').trim();
    const itemCodeRaw = String(row.itemCode || '').trim();
    const entryDateRaw = row.entryDate == null ? '' : String(row.entryDate).trim();
    const expiryDateRaw = row.expiryDate == null ? '' : String(row.expiryDate).trim();

    return {
      index,
      itemCode: itemCodeRaw ? itemCodeRaw.toUpperCase() : '',
      itemName: chemicalName,
      chemicalName,
      category,
      quantity: Number(row.quantity ?? 0),
      quantityUnit,
      costPerUnit: Number(row.costPerUnit ?? 0),
      minThreshold: Number(row.minThreshold ?? 0),
      casNumber: String(row.casNumber || '').trim(),
      smiles: String(row.smiles || '').trim(),
      inchi: String(row.inchi || '').trim(),
      chemicalFormula: String(row.chemicalFormula || '').trim(),
      manufacturingCompany: String(row.manufacturingCompany || '').trim(),
      entryDateRaw,
      expiryDateRaw,
      entryDate: parseOptionalDate(row.entryDate, null),
      storageLocation: String(row.storageLocation || '').trim(),
      lotNumber: String(row.lotNumber || '').trim(),
      expiryDate: parseOptionalDate(row.expiryDate, null),
      abstract: String(row.abstract || '').trim(),
      pubmedId: String(row.pubmedId || '').trim(),
    };
  });

  const errors = [];
  const validDocs = [];
  const seenCodes = new Set();

  for (const row of normalizedItems) {
    if (!row.chemicalName) {
      errors.push({ index: row.index, code: 'MISSING_CHEMICAL_NAME', message: 'chemicalName is required' });
      continue;
    }
    if (!row.quantityUnit) {
      errors.push({ index: row.index, code: 'MISSING_QUANTITY_UNIT', message: 'quantityUnit is required' });
      continue;
    }
    if (!Number.isFinite(row.quantity) || row.quantity < 0) {
      errors.push({ index: row.index, code: 'INVALID_QUANTITY', message: 'quantity must be a number >= 0' });
      continue;
    }
    if (!Number.isFinite(row.minThreshold) || row.minThreshold < 0) {
      errors.push({ index: row.index, code: 'INVALID_MIN_THRESHOLD', message: 'minThreshold must be a number >= 0' });
      continue;
    }
    if (!Number.isFinite(row.costPerUnit) || row.costPerUnit < 0) {
      errors.push({ index: row.index, code: 'INVALID_COST_PER_UNIT', message: 'costPerUnit must be a number >= 0' });
      continue;
    }
    if (row.entryDateRaw && !row.entryDate) {
      errors.push({ index: row.index, code: 'INVALID_ENTRY_DATE', message: 'entryDate must be a valid date (YYYY-MM-DD recommended)' });
      continue;
    }
    if (row.expiryDateRaw && !row.expiryDate) {
      errors.push({ index: row.index, code: 'INVALID_EXPIRY_DATE', message: 'expiryDate must be a valid date (YYYY-MM-DD recommended)' });
      continue;
    }

    if (!row.itemCode) {
      row.itemCode = buildGeneratedCode(row.chemicalName, row.casNumber, row.manufacturingCompany);
      row.itemCode = `${row.itemCode}${String(row.index).padStart(3, '0')}`;
    }

    if (seenCodes.has(row.itemCode)) {
      errors.push({ index: row.index, code: 'DUPLICATE_ITEM_CODE_IN_FILE', message: `Duplicate itemCode ${row.itemCode} in import file` });
      continue;
    }
    seenCodes.add(row.itemCode);

    validDocs.push(row);
  }

  if (validDocs.length === 0) {
    res.status(400);
    throw new Error('No valid rows to import');
  }

  const existingItems = await Inventory.find({ labId, itemCode: { $in: validDocs.map((doc) => doc.itemCode) } });
  const existingMap = new Map();
  for (const item of existingItems) {
    existingMap.set(String(item.itemCode || '').toUpperCase(), item);
  }

  const createdItems = [];
  const updatedItems = [];
  const skipped = []; // kept for compatibility if needed

  // Custom safeRound helper since we're dealing with numbers
  const safeRound = (val) => Math.round(val * 100) / 100;

  for (const doc of validDocs) {
    const existingItem = existingMap.get(doc.itemCode);

    if (existingItem) {
      try {
        existingItem.category = doc.category || existingItem.category;
        existingItem.quantityUnit = doc.quantityUnit || existingItem.quantityUnit;
        existingItem.costPerUnit = doc.costPerUnit || existingItem.costPerUnit;
        existingItem.minThreshold = doc.minThreshold || existingItem.minThreshold;
        
        const newQty = Number(doc.quantity) || 0;
        if (importMode === 'replace') {
          existingItem.quantity = safeRound(newQty);
        } else {
          existingItem.quantity = safeRound((existingItem.quantity || 0) + newQty);
        }

        existingItem.casNumber = doc.casNumber || existingItem.casNumber;
        existingItem.smiles = doc.smiles || existingItem.smiles;
        existingItem.inchi = doc.inchi || existingItem.inchi;
        existingItem.chemicalFormula = doc.chemicalFormula || existingItem.chemicalFormula;
        existingItem.manufacturingCompany = doc.manufacturingCompany || existingItem.manufacturingCompany;
        existingItem.storageLocation = doc.storageLocation || existingItem.storageLocation;
        existingItem.lotNumber = doc.lotNumber || existingItem.lotNumber;
        existingItem.expiryDate = doc.expiryDate || existingItem.expiryDate;
        existingItem.abstract = doc.abstract || existingItem.abstract;
        existingItem.pubmedId = doc.pubmedId || existingItem.pubmedId;
        existingItem.lastUpdated = new Date();

        await existingItem.save();
        updatedItems.push(existingItem);
      } catch (error) {
        errors.push({
          index: doc.index,
          code: 'UPDATE_FAILED',
          message: error?.message || 'Failed to update item',
          itemCode: doc.itemCode,
        });
      }
    } else {
      try {
        const item = await Inventory.create({
          labId,
          itemCode: doc.itemCode,
          itemName: doc.itemName,
          chemicalName: doc.chemicalName,
          category: doc.category,
          quantity: safeRound(doc.quantity),
          quantityUnit: doc.quantityUnit,
          costPerUnit: doc.costPerUnit,
          minThreshold: doc.minThreshold,
          casNumber: doc.casNumber,
          smiles: doc.smiles,
          inchi: doc.inchi,
          chemicalFormula: doc.chemicalFormula,
          manufacturingCompany: doc.manufacturingCompany,
          entryDate: doc.entryDate || new Date(),
          storageLocation: doc.storageLocation,
          lotNumber: doc.lotNumber,
          expiryDate: doc.expiryDate,
          abstract: doc.abstract,
          pubmedId: doc.pubmedId,
          lastUpdated: new Date(),
        });
        createdItems.push(item);
      } catch (error) {
        errors.push({
          index: doc.index,
          code: 'CREATE_FAILED',
          message: error?.message || 'Failed to create item',
          itemCode: doc.itemCode,
        });
      }
    }
  }

  await createAuditEntry({
    userId: req.user._id,
    action: 'bulk_import_inventory',
    details: `Bulk import inventory: created ${createdItems.length}, updated ${updatedItems.length}, errors ${errors.length}`,
    entityType: 'inventory',
    entityId: null,
    metadata: {
      labId,
      createdCount: createdItems.length,
      updatedCount: updatedItems.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      importMode
    },
  });

  getIo().emit('inventory.updated', { action: 'bulk_import', item: { itemName: 'Bulk import', _id: `bulk-${Date.now()}` } });

  res.status(201).json({
    success: true,
    data: {
      created: createdItems.map((entry) => decorateInventoryAbstract(entry)),
      createdCount: createdItems.length,
      updatedCount: updatedItems.length,
      skippedCount: 0,
      errors,
      errorCount: errors.length,
    },
  });
});

const getSmartInventory = asyncHandler(async (req, res) => {
  const rawLabId = req.query.labId || req.user?.labId;
  const queryIds = [];
  if (rawLabId) {
    queryIds.push(rawLabId, rawLabId.toString());
    if (mongoose.Types.ObjectId.isValid(rawLabId)) {
      queryIds.push(new mongoose.Types.ObjectId(rawLabId));
    }
  }

  // 1. Fetch all experiments for this lab
  const LabStructure = require('../models/LabStructure');
  let experiments = [];
  if (queryIds.length > 0) {
    experiments = await LabStructure.find({ labId: { $in: queryIds } }).lean();
  }

  if (experiments.length === 0) {
    const Lab = require('../models/Lab');
    let lab = null;
    if (rawLabId && mongoose.Types.ObjectId.isValid(rawLabId)) {
      lab = await Lab.findById(rawLabId);
    }
    if (lab) {
      experiments = await LabStructure.find({
        $or: [
          { labName: lab.labName || lab.name },
          { courseType: lab.courseType, year: String(lab.year || '1'), semester: String(lab.semester || '1') }
        ]
      }).lean();
    }
  }

  if (experiments.length === 0) {
    experiments = await LabStructure.find({}).lean();
  }

  // 2. Aggregate unique chemicals across all experiments
  const chemicalMap = {};
  experiments.forEach(exp => {
    (exp.chemicals || []).forEach(chem => {
      if (!chem.chemicalName) return;
      const key = chem.chemicalName.toLowerCase().trim();
      if (!chemicalMap[key]) {
        chemicalMap[key] = {
          chemicalName: chem.chemicalName.trim(),
          quantityPerStudent: Number(chem.quantityPerStudent || chem.quantity || 1),
          unit: chem.unit || 'g',
          usedInExperiments: [],
          labStock: 0,
          status: 'Not Available',
          inInventory: false,
          inventoryItemId: null
        };
      }
      const expLabel = `Exp ${exp.experimentNo || 1} (${exp.subject || 'General'})`;
      if (!chemicalMap[key].usedInExperiments.includes(expLabel)) {
        chemicalMap[key].usedInExperiments.push(expLabel);
      }
    });
  });

  // 3. Query current lab inventory
  const criteria = {};
  if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId || rawLabId;
  } else if (rawLabId) {
    criteria.labId = rawLabId;
  }
  const labInventory = await Inventory.find(criteria).lean();

  // 4. Match lab inventory stock to required chemicals
  labInventory.forEach(item => {
    const key = (item.chemicalName || item.itemName || '').toLowerCase().trim();
    const stock = Number(item.quantityAvailable ?? item.quantity ?? 0);

    if (chemicalMap[key]) {
      chemicalMap[key].labStock = stock;
      chemicalMap[key].unit = item.quantityUnit || chemicalMap[key].unit;
      chemicalMap[key].inInventory = true;
      chemicalMap[key].inventoryItemId = item._id;

      const reqPerStudent = chemicalMap[key].quantityPerStudent || 1;
      const tenStudentNeed = reqPerStudent * 10;

      if (stock === 0) {
        chemicalMap[key].status = 'Not Available';
      } else if (stock < tenStudentNeed) {
        chemicalMap[key].status = 'Low';
      } else {
        chemicalMap[key].status = 'Available';
      }
    }
  });

  const chemicalsList = Object.values(chemicalMap);
  const totalNeeded = chemicalsList.length;
  const availableCount = chemicalsList.filter(c => c.status === 'Available').length;
  const lowCount = chemicalsList.filter(c => c.status === 'Low').length;
  const notAvailableCount = chemicalsList.filter(c => c.status === 'Not Available').length;
  const inStockCount = labInventory.length;

  res.json({
    success: true,
    chemicals: chemicalsList,
    totalNeeded,
    available: availableCount,
    low: lowCount,
    notAvailable: notAvailableCount,
    inStockCount,
    inventory: labInventory
  });
});

module.exports = {
  createInventory,
  updateInventory,
  deleteInventory,
  getInventory,
  getInventoryById,
  fetchChemicalAbstractForInventory,
  fetchChemicalDataForInventory,
  bulkImportInventory,
  getSmartInventory,
};
