const asyncHandler = require('express-async-handler');
const StoreItem = require('../models/StoreItem');
const ActivityLog = require('../models/ActivityLog');
const { getChemicalAbstract } = require('../utils/pubmedService');

const CATEGORY_OPTIONS = ['Glassware', 'Chemical'];
const CHEMICAL_UNITS = ['mL', 'L', 'uL', 'mg', 'g', 'kg'];

const normalizeStoreCategory = (value) => {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'glassware') return 'Glassware';
  if (normalized === 'chemical') return 'Chemical';
  return String(value).trim();
};

const normalizeStoreUnit = (category, unit) => {
  if (category === 'Glassware') return 'pieces';
  return String(unit || '').trim();
};

const validateStorePayload = ({ category, quantityUnit }) => {
  if (!CATEGORY_OPTIONS.includes(category)) {
    const error = new Error('Category must be either Glassware or Chemical.');
    error.statusCode = 400;
    throw error;
  }

  if (category === 'Chemical' && !CHEMICAL_UNITS.includes(quantityUnit)) {
    const error = new Error('Chemical quantity unit must be one of mL, L, uL, mg, g, or kg.');
    error.statusCode = 400;
    throw error;
  }
};

const buildStoreSnapshot = (item) => ({
  itemCode: item.itemCode,
  itemName: item.itemName,
  category: item.category,
  subCategory: item.subCategory,
  quantity: item.quantity,
  quantityUnit: item.quantityUnit,
  storageLocation: item.storageLocation || '',
  description: item.description || '',
  abstract: item.abstract || '',
  pubmedId: item.pubmedId || '',
});

const createStoreLog = ({ userId, action, details, entityId = null, metadata = null }) =>
  ActivityLog.create({
    userId,
    action,
    details,
    entityType: 'storeItem',
    entityId,
    metadata,
  });

const listStoreItems = asyncHandler(async (req, res) => {
  const { category = '', subCategory = '', search = '', page = 1, limit = 100 } = req.query;
  const filter = {};

  if (category) filter.category = { $regex: category, $options: 'i' };
  if (subCategory) filter.subCategory = { $regex: subCategory, $options: 'i' };
  if (search) {
    filter.$or = [
      { itemName: { $regex: search, $options: 'i' } },
      { itemCode: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await StoreItem.countDocuments(filter);
  const items = await StoreItem.find(filter)
    .sort({ category: 1, subCategory: 1, itemName: 1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: items, pagination: { total, page: Number(page), limit: Number(limit) } });
});

const createStoreItem = asyncHandler(async (req, res) => {
  const { itemCode, itemName, category, subCategory, quantity, quantityUnit, storageLocation, description, abstract, pubmedId } = req.body;
  const normalizedCategory = normalizeStoreCategory(category);
  const normalizedUnit = normalizeStoreUnit(normalizedCategory, quantityUnit);
  validateStorePayload({ category: normalizedCategory, quantityUnit: normalizedUnit });

  const cleanName = (itemName || '').trim();
  const normalizedCode = (itemCode || '').trim().toUpperCase();

  // Search if item already exists by code or by name
  const existingItem = await StoreItem.findOne({
    $or: [
      { itemCode: normalizedCode },
      { itemName: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    ]
  });

  const addQty = Number(quantity) || 0;

  if (existingItem) {
    const previousQty = existingItem.quantity || 0;
    existingItem.quantity = Math.round(((existingItem.quantity || 0) + addQty) * 100) / 100;
    if (storageLocation) existingItem.storageLocation = storageLocation.trim();
    if (description) existingItem.description = description.trim();
    existingItem.lastUpdated = new Date();
    await existingItem.save();

    await createStoreLog({
      userId: req.user._id,
      action: 'restock_store_item',
      details: `Restocked chemical ${existingItem.itemName} (${existingItem.itemCode}): Added +${addQty} ${existingItem.quantityUnit}. New total: ${existingItem.quantity}`,
      entityId: existingItem._id,
      metadata: { before: { quantity: previousQty }, after: buildStoreSnapshot(existingItem) },
    });

    return res.status(200).json({ 
      success: true, 
      data: existingItem, 
      restocked: true,
      message: `Stock added to existing item ${existingItem.itemName} (${existingItem.itemCode}). Added +${addQty} ${existingItem.quantityUnit}. New total: ${existingItem.quantity}` 
    });
  }

  const item = await StoreItem.create({
    itemCode: normalizedCode || `CHEM-${Date.now().toString().slice(-6)}`,
    itemName: cleanName,
    category: normalizedCategory,
    subCategory: (subCategory || 'General').trim(),
    quantity: addQty,
    quantityUnit: normalizedUnit,
    storageLocation: storageLocation?.trim() || '',
    description: description?.trim() || '',
    abstract: abstract?.trim() || '',
    pubmedId: pubmedId?.trim() || '',
    lastUpdated: new Date(),
  });

  await createStoreLog({
    userId: req.user._id,
    action: 'create_store_item',
    details: `Created store item ${item.itemName} (${item.itemCode}) with ${item.quantity} ${item.quantityUnit}`,
    entityId: item._id,
    metadata: { after: buildStoreSnapshot(item) },
  });

  res.status(201).json({ success: true, data: item, restocked: false });
});

const updateStoreItem = asyncHandler(async (req, res) => {
  const item = await StoreItem.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Store item not found');
  }

  const updates = { ...req.body };
  const before = buildStoreSnapshot(item);

  if (updates.itemCode != null) {
    updates.itemCode = String(updates.itemCode).trim().toUpperCase();
    const duplicate = await StoreItem.findOne({ _id: { $ne: item._id }, itemCode: updates.itemCode });
    if (duplicate) {
      res.status(409);
      throw new Error('This store item is already listed.');
    }
  }

  if (updates.itemName != null) updates.itemName = String(updates.itemName).trim();
  if (updates.category != null) updates.category = normalizeStoreCategory(updates.category);
  if (updates.subCategory != null) updates.subCategory = String(updates.subCategory).trim();
  if (updates.quantityUnit != null || updates.category != null) {
    updates.quantityUnit = normalizeStoreUnit(updates.category || item.category, updates.quantityUnit != null ? updates.quantityUnit : item.quantityUnit);
  }
  if (updates.storageLocation != null) updates.storageLocation = String(updates.storageLocation).trim();
  if (updates.description != null) updates.description = String(updates.description).trim();
  if (updates.abstract != null) updates.abstract = String(updates.abstract).trim();
  if (updates.pubmedId != null) updates.pubmedId = String(updates.pubmedId).trim();
  if (updates.quantity != null && Number(updates.quantity) < 0) {
    res.status(400);
    throw new Error('Quantity cannot be negative');
  }
  validateStorePayload({ category: updates.category || item.category, quantityUnit: updates.quantityUnit || item.quantityUnit });

  Object.assign(item, updates);
  item.lastUpdated = new Date();
  await item.save();

  await createStoreLog({
    userId: req.user._id,
    action: 'update_store_item',
    details: `Updated store item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before, after: buildStoreSnapshot(item) },
  });

  res.json({ success: true, data: item });
});

const deleteStoreItem = asyncHandler(async (req, res) => {
  const item = await StoreItem.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Store item not found');
  }

  const before = buildStoreSnapshot(item);
  await item.deleteOne();

  await createStoreLog({
    userId: req.user._id,
    action: 'delete_store_item',
    details: `Deleted store item ${item.itemName} (${item.itemCode})`,
    entityId: item._id,
    metadata: { before },
  });

  res.json({ success: true, message: 'Store item deleted' });
});

const fetchChemicalAbstract = asyncHandler(async (req, res) => {
  const { chemicalName, storeItemId } = req.body;

  if (!chemicalName || chemicalName.trim().length === 0) {
    res.status(400);
    throw new Error('Chemical name is required');
  }

  try {
    const abstractData = await getChemicalAbstract(chemicalName.trim());

    // If storeItemId is provided, update the item with the fetched abstract
    if (storeItemId && abstractData.source === 'pubmed') {
      const item = await StoreItem.findById(storeItemId);
      if (item && item.category === 'Chemical') {
        item.abstract = abstractData.abstract;
        item.pubmedId = abstractData.pmid;
        item.lastUpdated = new Date();
        await item.save();

        await createStoreLog({
          userId: req.user._id,
          action: 'update_abstract',
          details: `Updated abstract for ${item.itemName} from PubMed`,
          entityId: item._id,
          metadata: { pmid: abstractData.pmid, source: 'pubmed' },
        });
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

const bulkImportStoreItems = asyncHandler(async (req, res) => {
  const { items, importMode } = req.body;

  if (!Array.isArray(items)) {
    res.status(400);
    throw new Error('Items must be an array');
  }

  if (importMode === 'replace') {
    // Replace all existing central store items
    await StoreItem.deleteMany({});
  }

  const processedItems = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];
    try {
      const normalizedCategory = normalizeStoreCategory(rawItem.category || 'Chemical');
      const normalizedUnit = normalizeStoreUnit(normalizedCategory, rawItem.quantityUnit || 'units');
      validateStorePayload({ category: normalizedCategory, quantityUnit: normalizedUnit });

      const normalizedCode = String(rawItem.itemCode || `AUTO-${Date.now()}-${i}`).trim().toUpperCase();
      
      const payload = {
        itemCode: normalizedCode,
        itemName: String(rawItem.itemName || rawItem.chemicalName || 'Unnamed Item').trim(),
        category: normalizedCategory,
        subCategory: String(rawItem.subCategory || 'Miscellaneous').trim(),
        quantity: Number(rawItem.quantity) || 0,
        quantityUnit: normalizedUnit,
        storageLocation: rawItem.storageLocation?.trim() || '',
        description: rawItem.description?.trim() || '',
        abstract: rawItem.abstract?.trim() || '',
        pubmedId: rawItem.pubmedId?.trim() || '',
        lastUpdated: new Date(),
      };

      if (importMode === 'merge') {
        const existing = await StoreItem.findOne({ itemCode: normalizedCode });
        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          processedItems.push(existing);
          continue;
        }
      }

      const newItem = await StoreItem.create(payload);
      processedItems.push(newItem);
    } catch (err) {
      errors.push({ row: i + 1, itemCode: rawItem.itemCode, error: err.message });
    }
  }

  await createStoreLog({
    userId: req.user._id,
    action: 'bulk_import_store_items',
    details: `Bulk imported ${processedItems.length} items using mode: ${importMode}`,
    metadata: { mode: importMode, successCount: processedItems.length, errorCount: errors.length },
  });

  res.status(201).json({
    success: true,
    data: processedItems,
    summary: {
      imported: processedItems.length,
      failed: errors.length,
      errors
    }
  });
});

module.exports = { listStoreItems, createStoreItem, updateStoreItem, deleteStoreItem, fetchChemicalAbstract, bulkImportStoreItems };
