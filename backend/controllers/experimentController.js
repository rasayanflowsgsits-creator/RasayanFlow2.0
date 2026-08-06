const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Experiment = require('../models/Experiment');
const LabStructure = require('../models/LabStructure');
const Lab = require('../models/Lab');
const Inventory = require('../models/Inventory');
const StudentRequest = require('../models/StudentRequest');
const ActivityLog = require('../models/ActivityLog');
const { getIo } = require('../sockets');

const assertLabAdminAccess = (req, labId, res) => {
  if (req.user.role !== 'labAdmin') return;

  if (!req.user.labId || String(req.user.labId) !== String(labId)) {
    res.status(403);
    throw new Error('Forbidden: lab admins can only manage experiments in their assigned lab');
  }
};

const buildRequirements = async (labId, requiredInventory = [], res) => {
  if (!Array.isArray(requiredInventory) || requiredInventory.length === 0) {
    res.status(400);
    throw new Error('At least one required inventory item is needed for an experiment');
  }

  const requirements = await Promise.all(
    requiredInventory.map(async (entry) => {
      const inventoryItem = await Inventory.findById(entry.inventoryItemId);
      if (!inventoryItem || String(inventoryItem.labId) !== String(labId)) {
        res.status(400);
        throw new Error('A required inventory item is missing or belongs to a different lab');
      }

      const quantity = Number(entry.quantity || 0);
      if (quantity <= 0) {
        res.status(400);
        throw new Error('Required inventory quantities must be greater than zero');
      }

      const costPerUnit = Number(inventoryItem.costPerUnit || 0);
      return {
        inventoryItemId: inventoryItem._id,
        chemicalName: inventoryItem.chemicalName || inventoryItem.itemName,
        quantity,
        quantityUnit: entry.quantityUnit?.trim() || inventoryItem.quantityUnit,
        costPerUnit,
        estimatedCost: Number((quantity * costPerUnit).toFixed(2)),
      };
    })
  );

  return requirements;
};

const createExperiment = asyncHandler(async (req, res) => {
  const { labId, experimentNumber, experimentObject, requiredInventory } = req.body;

  assertLabAdminAccess(req, labId, res);

  const normalizedNumber = String(experimentNumber || '').trim();
  if (!normalizedNumber) {
    res.status(400);
    throw new Error('experimentNumber is required');
  }

  const duplicate = await Experiment.findOne({ labId, experimentNumber: normalizedNumber });
  if (duplicate) {
    res.status(409);
    throw new Error('This experiment number already exists in the selected lab');
  }

  const requirements = await buildRequirements(labId, requiredInventory, res);
  const totalEstimatedExpense = requirements.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);

  const experiment = await Experiment.create({
    labId,
    experimentNumber: normalizedNumber,
    experimentObject: experimentObject.trim(),
    requiredInventory: requirements,
    totalEstimatedExpense,
    createdBy: req.user._id,
    updatedAt: new Date(),
  });

  await ActivityLog.create({
    userId: req.user._id,
    action: 'create_experiment',
    details: `Created experiment ${experiment.experimentNumber}`,
    entityType: 'experiment',
    entityId: experiment._id,
  });

  getIo().emit('experiment.updated', { action: 'created', experimentId: experiment._id });

  const populated = await Experiment.findById(experiment._id)
    .populate('labId', 'labName labCode')
    .populate('requiredInventory.inventoryItemId', 'itemName chemicalName quantity quantityUnit costPerUnit');

  res.status(201).json({ success: true, data: populated });
});

const getExperiments = asyncHandler(async (req, res) => {
  const { labId, search = '' } = req.query;
  const criteria = {};

  if (req.user.role === 'labAdmin') {
    criteria.labId = req.user.labId;
  } else if (labId) {
    criteria.labId = labId;
  }

  if (search.trim()) {
    criteria.$or = [
      { experimentNumber: { $regex: search.trim(), $options: 'i' } },
      { experimentObject: { $regex: search.trim(), $options: 'i' } },
      { 'requiredInventory.chemicalName': { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const experiments = await Experiment.find(criteria)
    .populate('labId', 'labName labCode')
    .populate('requiredInventory.inventoryItemId', 'itemName chemicalName quantity quantityUnit costPerUnit')
    .sort({ updatedAt: -1, createdAt: -1 });

  res.json({ success: true, data: experiments });
});

const deleteExperiment = asyncHandler(async (req, res) => {
  const experiment = await Experiment.findById(req.params.id);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  assertLabAdminAccess(req, experiment.labId, res);

  await experiment.deleteOne();
  await ActivityLog.create({
    userId: req.user._id,
    action: 'delete_experiment',
    details: `Deleted experiment ${experiment.experimentNumber}`,
    entityType: 'experiment',
    entityId: experiment._id,
  });
  getIo().emit('experiment.updated', { action: 'deleted', experimentId: experiment._id });

  res.json({ success: true, message: 'Experiment deleted' });
});

const bulkImportExperiments = asyncHandler(async (req, res) => {
  const { labId, experiments } = req.body;

  if (!labId) {
    res.status(400);
    throw new Error('labId is required');
  }

  if (!Array.isArray(experiments) || experiments.length === 0) {
    res.status(400);
    throw new Error('experiments must be a non-empty array');
  }

  assertLabAdminAccess(req, labId, res);

  const inventory = await Inventory.find({ labId }).select('_id itemCode chemicalName itemName quantityUnit costPerUnit');
  const inventoryByCode = new Map(
    inventory
      .filter((item) => item.itemCode)
      .map((item) => [String(item.itemCode).toUpperCase(), item])
  );

  const existingNumbers = await Experiment.find({
    labId,
    experimentNumber: { $in: experiments.map((exp) => String(exp?.experimentNumber || '').trim()).filter(Boolean) },
  }).select('experimentNumber');
  const existingExperimentNumbers = new Set(existingNumbers.map((entry) => String(entry.experimentNumber || '').trim()));

  const created = [];
  const skipped = [];
  const errors = [];

  for (let index = 0; index < experiments.length; index += 1) {
    const raw = experiments[index] && typeof experiments[index] === 'object' ? experiments[index] : {};
    const experimentNumber = String(raw.experimentNumber || '').trim();
    const experimentObject = String(raw.experimentObject || '').trim();
    const requiredInventory = Array.isArray(raw.requiredInventory) ? raw.requiredInventory : [];

    if (!experimentNumber) {
      errors.push({ index, code: 'MISSING_EXPERIMENT_NUMBER', message: 'experimentNumber is required' });
      continue;
    }
    if (!experimentObject) {
      errors.push({ index, code: 'MISSING_EXPERIMENT_OBJECT', message: 'experimentObject is required' });
      continue;
    }
    if (existingExperimentNumbers.has(experimentNumber)) {
      skipped.push({ index, experimentNumber, reason: 'EXPERIMENT_NUMBER_EXISTS' });
      continue;
    }

    if (!requiredInventory.length) {
      errors.push({ index, experimentNumber, code: 'MISSING_REQUIREMENTS', message: 'At least one requiredInventory row is required' });
      continue;
    }

    const resolvedRequiredInventory = [];
    let requirementsError = null;

    for (let requirementIndex = 0; requirementIndex < requiredInventory.length; requirementIndex += 1) {
      const entry = requiredInventory[requirementIndex] && typeof requiredInventory[requirementIndex] === 'object' ? requiredInventory[requirementIndex] : {};
      const inventoryItemId = entry.inventoryItemId ? String(entry.inventoryItemId).trim() : '';
      const itemCode = entry.itemCode ? String(entry.itemCode).trim().toUpperCase() : '';
      const quantity = Number(entry.quantity || 0);
      const quantityUnit = entry.quantityUnit ? String(entry.quantityUnit).trim() : '';

      if (inventoryItemId) {
        resolvedRequiredInventory.push({ inventoryItemId, quantity, quantityUnit });
        continue;
      }

      if (!itemCode) {
        requirementsError = {
          index,
          code: 'MISSING_ITEM_CODE',
          message: `Requirement #${requirementIndex + 1}: itemCode is required (or inventoryItemId)`,
        };
        break;
      }

      const inventoryItem = inventoryByCode.get(itemCode);
      if (!inventoryItem) {
        requirementsError = {
          index,
          code: 'UNKNOWN_ITEM_CODE',
          message: `Requirement #${requirementIndex + 1}: itemCode ${itemCode} not found in this lab inventory`,
        };
        break;
      }

      resolvedRequiredInventory.push({
        inventoryItemId: inventoryItem._id,
        quantity,
        quantityUnit: quantityUnit || inventoryItem.quantityUnit,
      });
    }

    if (requirementsError) {
      errors.push(requirementsError);
      continue;
    }

    try {
      const requirements = await buildRequirements(labId, resolvedRequiredInventory, res);
      const totalEstimatedExpense = requirements.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);

      const experiment = await Experiment.create({
        labId,
        experimentNumber,
        experimentObject,
        requiredInventory: requirements,
        totalEstimatedExpense,
        createdBy: req.user._id,
        updatedAt: new Date(),
      });

      created.push(experiment);
      existingExperimentNumbers.add(experimentNumber);
    } catch (error) {
      errors.push({ index, experimentNumber, code: 'CREATE_FAILED', message: error?.message || 'Failed to create experiment' });
    }
  }

  await ActivityLog.create({
    userId: req.user._id,
    action: 'bulk_import_experiments',
    details: `Bulk import experiments: created ${created.length}, skipped ${skipped.length}, errors ${errors.length}`,
    entityType: 'experiment',
    entityId: null,
    metadata: {
      labId,
      createdCount: created.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      skipped: skipped.slice(0, 50),
      errors: errors.slice(0, 50),
    },
  });

  getIo().emit('experiment.updated', { action: 'bulk_import', experimentId: `bulk-${Date.now()}` });

  const createdPopulated = await Experiment.find({ _id: { $in: created.map((exp) => exp._id) } })
    .populate('labId', 'labName labCode')
    .populate('requiredInventory.inventoryItemId', 'itemName chemicalName quantity quantityUnit costPerUnit')
    .sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    data: {
      created: createdPopulated,
      createdCount: created.length,
      skipped,
      skippedCount: skipped.length,
      errors,
      errorCount: errors.length,
    },
  });
});

const getExperimentsByLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;

  if (!labId) {
    res.status(400);
    throw new Error('labId is required');
  }

  let lab = null;
  if (mongoose.Types.ObjectId.isValid(labId)) {
    lab = await Lab.findById(labId);
  }
  if (!lab && labId && labId !== 'undefined' && labId !== 'null') {
    lab = await Lab.findOne({ $or: [{ labCode: labId }, { labName: labId }, { name: labId }] });
  }

  // 1. Query LabStructure handling both String and ObjectId match for labId
  let labStructureDocs = [];
  if (mongoose.Types.ObjectId.isValid(labId)) {
    labStructureDocs = await LabStructure.find({
      $or: [{ labId: String(labId) }, { labId: new mongoose.Types.ObjectId(labId) }]
    }).lean();
  } else {
    labStructureDocs = await LabStructure.find({ labId: String(labId) }).lean();
  }

  // 2. Query Experiment handling both String and ObjectId match for labId
  let experimentDocs = [];
  if (mongoose.Types.ObjectId.isValid(labId)) {
    experimentDocs = await Experiment.find({
      $or: [{ labId: String(labId) }, { labId: new mongoose.Types.ObjectId(labId) }]
    }).lean();
  } else {
    experimentDocs = await Experiment.find({ labId: String(labId) }).lean();
  }

  // If empty and target lab document exists, fallback match by lab._id or labName
  if (lab && labStructureDocs.length === 0) {
    labStructureDocs = await LabStructure.find({
      $or: [
        { labId: lab._id },
        { labId: String(lab._id) },
        { labName: new RegExp('^' + (lab.labName || lab.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
      ]
    }).lean();
  }

  if (lab && experimentDocs.length === 0) {
    experimentDocs = await Experiment.find({
      $or: [
        { labId: lab._id },
        { labId: String(lab._id) }
      ]
    }).lean();
  }

  // Convert to standard experiment list format
  let experiments = [];

  if (labStructureDocs.length > 0) {
    experiments = labStructureDocs.map(doc => ({
      _id: doc._id,
      labId: doc.labId,
      subject: doc.subject || doc.labName || 'General',
      experimentNo: doc.experimentNo,
      experimentName: doc.experimentName,
      chemicals: (doc.chemicals || []).map(c => ({
        chemicalName: c.chemicalName,
        quantityPerStudent: c.quantityPerStudent || c.quantity || 1,
        unit: c.unit || c.quantityUnit || 'mL'
      }))
    }));
  } else if (experimentDocs.length > 0) {
    experiments = experimentDocs.map((doc, idx) => ({
      _id: doc._id,
      labId: doc.labId,
      subject: doc.subject || doc.department || lab?.labName || 'General',
      experimentNo: parseInt(String(doc.experimentNumber).replace(/\D/g, ''), 10) || (idx + 1),
      experimentName: doc.experimentObject || doc.experimentNumber,
      chemicals: (doc.requiredInventory || []).map(c => ({
        chemicalName: c.chemicalName,
        quantityPerStudent: c.quantity || 1,
        unit: c.quantityUnit || 'mL'
      }))
    }));
  }

  // Stock status enrichment from Inventory
  const inventory = await Inventory.find({}).lean();
  const enriched = experiments.map(exp => {
    let allAvailable = true;
    let anyAvailable = false;
    const chems = (exp.chemicals || []).map(chem => {
      const invItem = inventory.find(i => i.chemicalName?.toLowerCase() === chem.chemicalName?.toLowerCase());
      const stock = invItem ? invItem.quantity : 0;
      const reqQty = Number(chem.quantityPerStudent || 1);
      let stockStatus = 'Not in Stock';
      if (stock >= reqQty) {
        stockStatus = `In Stock (${stock})`;
        anyAvailable = true;
      } else if (stock > 0) {
        stockStatus = `Low Stock (${stock})`;
        allAvailable = false;
        anyAvailable = true;
      } else {
        allAvailable = false;
      }
      return { ...chem, stock, stockStatus };
    });
    const status = chems.length === 0 || allAvailable ? 'Available' : anyAvailable ? 'Low' : 'Out';
    return { ...exp, chemicals: chems, status };
  });

  // Group by subject
  const subjects = {};
  enriched.forEach(exp => {
    const subjKey = exp.subject || 'General';
    if (!subjects[subjKey]) {
      subjects[subjKey] = [];
    }
    subjects[subjKey].push(exp);
  });

  // Fetch student's existing requests for this lab
  let studentRequests = [];
  if (req.user) {
    const studentId = req.user._id || req.user.id;
    studentRequests = await StudentRequest.find({ studentId }).sort({ requestedAt: -1 }).lean();
  }

  res.json({
    success: true,
    lab,
    experiments: enriched,
    data: enriched,
    subjects,
    totalExperiments: enriched.length,
    studentRequests
  });
});

module.exports = {
  createExperiment,
  getExperiments,
  getExperimentsByLab,
  deleteExperiment,
  bulkImportExperiments,
};
