// Lab Structure Controller - Updated for student experiment visibility & upload sync
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const LabStructure = require('../models/LabStructure');
const Experiment = require('../models/Experiment');
const Lab = require('../models/Lab');
const Inventory = require('../models/Inventory');
const StudentRequest = require('../models/StudentRequest');

const DEFAULT_HAP1_EXPERIMENTS = [
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 1,
    experimentName: 'Study of Compound Microscope and Its Microscopic Components',
    chemicals: [
      { chemicalName: 'Distilled Water', quantityPerStudent: 10, unit: 'mL' },
      { chemicalName: 'Glass Slides & Coverslips', quantityPerStudent: 2, unit: 'pcs' },
      { chemicalName: 'Lens Cleaning Paper', quantityPerStudent: 1, unit: 'pkt' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 2,
    experimentName: 'Microscopic Examination of Epithelial and Connective Tissues',
    chemicals: [
      { chemicalName: 'Eosin Stain Solution 1%', quantityPerStudent: 5, unit: 'mL' },
      { chemicalName: 'Hematoxylin Stain Solution', quantityPerStudent: 5, unit: 'mL' },
      { chemicalName: 'Glycerin Mountant', quantityPerStudent: 2, unit: 'mL' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 3,
    experimentName: 'Determination of Total Red Blood Cell (RBC) Count using Hemocytometer',
    chemicals: [
      { chemicalName: 'Hayems Diluting Fluid for RBC', quantityPerStudent: 20, unit: 'mL' },
      { chemicalName: 'Absolute Alcohol (70% Ethanol)', quantityPerStudent: 10, unit: 'mL' },
      { chemicalName: 'Sterile Disposable Lancets', quantityPerStudent: 2, unit: 'pcs' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 4,
    experimentName: 'Determination of Total White Blood Cell (WBC) Count using Hemocytometer',
    chemicals: [
      { chemicalName: 'Turks Diluting Fluid for WBC', quantityPerStudent: 20, unit: 'mL' },
      { chemicalName: 'Glacial Acetic Acid Solution', quantityPerStudent: 5, unit: 'mL' },
      { chemicalName: 'Gentian Violet Indicator Solution', quantityPerStudent: 1, unit: 'mL' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 5,
    experimentName: "Estimation of Hemoglobin Content by Sahli's Acid Hematin Method",
    chemicals: [
      { chemicalName: 'Hydrochloric Acid 0.1N (0.1M)', quantityPerStudent: 20, unit: 'mL' },
      { chemicalName: 'Distilled Water', quantityPerStudent: 50, unit: 'mL' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 6,
    experimentName: 'Determination of Blood Grouping (ABO & Rh Factor typing)',
    chemicals: [
      { chemicalName: 'Anti-A Monoclonal Antibody Serum', quantityPerStudent: 0.5, unit: 'mL' },
      { chemicalName: 'Anti-B Monoclonal Antibody Serum', quantityPerStudent: 0.5, unit: 'mL' },
      { chemicalName: 'Anti-D (Rh) Monoclonal Antibody Serum', quantityPerStudent: 0.5, unit: 'mL' },
      { chemicalName: 'Normal Saline (0.9% NaCl)', quantityPerStudent: 10, unit: 'mL' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 7,
    experimentName: 'Determination of Bleeding Time (Duke Method) and Clotting Time',
    chemicals: [
      { chemicalName: 'Filter Paper Discs Grade 1', quantityPerStudent: 5, unit: 'pcs' },
      { chemicalName: 'Glass Capillary Tubes', quantityPerStudent: 3, unit: 'pcs' },
      { chemicalName: '70% Isopropanol Swabs', quantityPerStudent: 2, unit: 'pcs' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 8,
    experimentName: 'Determination of Erythrocyte Sedimentation Rate (ESR) by Westergren Method',
    chemicals: [
      { chemicalName: 'Sodium Citrate 3.8% Solution', quantityPerStudent: 5, unit: 'mL' },
      { chemicalName: 'Westergren ESR Tube', quantityPerStudent: 1, unit: 'pcs' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 9,
    experimentName: 'Recording of Human Blood Pressure using Sphygmomanometer',
    chemicals: [
      { chemicalName: 'Stethoscope & Cuff Assembly', quantityPerStudent: 1, unit: 'pcs' },
      { chemicalName: 'Alcohol Cleansing Swabs', quantityPerStudent: 2, unit: 'pcs' }
    ]
  },
  {
    subject: 'HAP1 (Human Anatomy & Physiology I)',
    experimentNo: 10,
    experimentName: 'Recording of Electrocardiogram (ECG) Waveforms and Heart Rate Analysis',
    chemicals: [
      { chemicalName: 'ECG Conductive Gel', quantityPerStudent: 15, unit: 'mL' },
      { chemicalName: 'ECG Thermal Recording Paper', quantityPerStudent: 1, unit: 'roll' }
    ]
  }
];

const resolveTargetLab = async (req) => {
  let targetId = req.params?.labId || req.body?.labId || req.query?.labId || req.user?.labId;
  if (targetId && targetId !== 'undefined' && targetId !== 'null') {
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      const found = await Lab.findById(targetId);
      if (found) return found;
    }
    const foundByCode = await Lab.findOne({ $or: [{ labCode: targetId }, { name: targetId }, { labName: targetId }] });
    if (foundByCode) return foundByCode;
  }
  
  // Search by assigned admin
  const user = req.user;
  if (user) {
    let matchedLab = await Lab.findOne({
      $or: [
        { admin: user.name },
        { adminEmail: user.email },
        { admins: user._id }
      ]
    });
    if (matchedLab) return matchedLab;
  }

  // Fallback to first available lab
  return await Lab.findOne();
};

// Helper to build flexible query array for labId (String & ObjectId)
const getLabIdQuery = (labId) => {
  if (!labId) return [];
  const list = [labId, labId.toString()];
  if (mongoose.Types.ObjectId.isValid(labId)) {
    list.push(new mongoose.Types.ObjectId(labId));
  }
  return list;
};

// @desc    Upload or update lab structure from CSV/Excel
// @route   POST /api/lab/structure/upload
// @access  Private (Lab Admin)
const uploadStructure = asyncHandler(async (req, res) => {
  const { structures, labId } = req.body;
  const targetLabId = labId || req.user?.labId;

  let lab = null;
  if (targetLabId && mongoose.Types.ObjectId.isValid(String(targetLabId))) {
    lab = await Lab.findById(targetLabId);
  }
  if (!lab) {
    lab = await resolveTargetLab(req);
  }

  if (!lab) {
    res.status(404);
    throw new Error('No target lab found for experiment upload');
  }

  if (!structures || !Array.isArray(structures) || structures.length === 0) {
    res.status(400);
    throw new Error('No structure data provided');
  }

  const labObjectId = new mongoose.Types.ObjectId(lab._id);

  // CRITICAL FIX: Delete ALL existing records for this lab first (including
  // auto-seeded defaults) so the real uploaded data is never blocked by
  // the unique-index constraint (labId + subject + experimentNo).
  await LabStructure.deleteMany({ labId: labObjectId });
  // Also clean Experiment collection entries for this lab
  try {
    await Experiment.deleteMany({ labId: labObjectId });
  } catch (e) { /* non-fatal */ }

  const uploadedRecords = [];
  const uploaderId = req.user._id || req.user.id;

  for (const exp of structures) {
    const { subject, experimentNo, experimentName, chemicals } = exp;
    if (!subject || !experimentNo || !experimentName) continue;

    try {
      const newStructure = await LabStructure.create({
        labId: labObjectId,
        labName: lab.labName || lab.name,
        courseType: lab.courseType || 'B.Pharm',
        year: String(lab.year || '1'),
        semester: String(lab.semester || '1'),
        subject,
        experimentNo: Number(experimentNo),
        experimentName,
        chemicals: chemicals || [],
        uploadedBy: uploaderId
      });
      uploadedRecords.push(newStructure);

      // Dual-save: also populate Experiment collection
      try {
        const expNoStr = `Exp ${String(experimentNo).padStart(2, '0')}`;
        await Experiment.findOneAndUpdate(
          { labId: labObjectId, experimentNumber: expNoStr },
          {
            labId: labObjectId,
            experimentNumber: expNoStr,
            experimentObject: experimentName,
            subject,
            department: subject,
            createdBy: uploaderId
          },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('Experiment dual-save warning:', e.message);
      }
    } catch (e) {
      console.error('LabStructure insert error for exp:', experimentName, e.message);
    }
  }

  res.status(200).json({ success: true, count: uploadedRecords.length, data: uploadedRecords });
});

// @desc    Get lab structure for lab admin
// @route   GET /api/lab/structure
// @access  Private (Lab Admin)
const getStructure = asyncHandler(async (req, res) => {
  const lab = await resolveTargetLab(req);

  if (!lab) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const queryIds = getLabIdQuery(lab._id);
  let structure = await LabStructure.find({ labId: { $in: queryIds } }).sort({ subject: 1, experimentNo: 1 });

  // Fallback: also search by labName
  if (structure.length === 0 && (lab.labName || lab.name)) {
    structure = await LabStructure.find({ labName: lab.labName || lab.name }).sort({ subject: 1, experimentNo: 1 });
  }

  // NOTE: Auto-seeding removed. It was causing silent duplicate-key errors
  // that blocked real uploaded experiments from saving.

  res.status(200).json({ success: true, count: structure.length, data: structure });
});

// @desc    Get lab structure for student with inventory status & requests
// @route   GET /api/lab/structure/student/:labId
// @access  Private (Student)
const getStudentStructure = asyncHandler(async (req, res) => {
  const labIdParam = req.params?.labId || req.query?.labId || req.body?.labId || req.user?.labId;

  let lab = null;
  if (labIdParam && mongoose.Types.ObjectId.isValid(labIdParam)) {
    lab = await Lab.findById(labIdParam);
  }
  if (!lab && labIdParam && labIdParam !== 'undefined' && labIdParam !== 'null') {
    lab = await Lab.findOne({ $or: [{ labCode: labIdParam }, { labName: labIdParam }, { name: labIdParam }] });
  }
  // CRITICAL FIX: Only use resolveTargetLab when NO labId param was provided at all.
  // If a specific labId was given but we couldn't find the lab, return empty instead of
  // accidentally returning a different lab's experiments.
  if (!lab && !labIdParam) {
    lab = await resolveTargetLab(req);
  }

  // If a labId was specified but no lab found, return empty cleanly
  if (!lab) {
    return res.json({
      success: true,
      lab: null,
      totalExperiments: 0,
      experiments: [],
      data: [],
      subjects: {},
      studentRequests: []
    });
  }

  const queryOr = [];
  if (lab) {
    const labObjectId = new mongoose.Types.ObjectId(lab._id);
    queryOr.push({ labId: labObjectId });
    queryOr.push({ labId: labObjectId.toString() });
    if (lab.labName || lab.name) {
      queryOr.push({ labName: new RegExp('^' + (lab.labName || lab.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    }
    if (lab.admins && Array.isArray(lab.admins) && lab.admins.length > 0) {
      const adminIds = lab.admins.map(a => (typeof a === 'object' && a._id ? a._id : a));
      queryOr.push({ uploadedBy: { $in: adminIds } });
    }
  }
  if (labIdParam && mongoose.Types.ObjectId.isValid(labIdParam)) {
    const pObjectId = new mongoose.Types.ObjectId(labIdParam);
    queryOr.push({ labId: pObjectId });
    queryOr.push({ labId: labIdParam });
  }

  let experiments = [];
  if (queryOr.length > 0) {
    experiments = await LabStructure.find({ $or: queryOr }).lean().sort({ subject: 1, experimentNo: 1 });
  }

  // Fallback: Check Experiment collection if LabStructure gave 0
  if (experiments.length === 0 && lab) {
    const labObjectId = new mongoose.Types.ObjectId(lab._id);
    const expOr = [{ labId: labObjectId }, { labId: lab._id.toString() }];
    if (lab.admins && Array.isArray(lab.admins) && lab.admins.length > 0) {
      const adminIds = lab.admins.map(a => (typeof a === 'object' && a._id ? a._id : a));
      expOr.push({ createdBy: { $in: adminIds } });
    }
    const expDocs = await Experiment.find({ $or: expOr }).lean();
    if (expDocs.length > 0) {
      experiments = expDocs.map((e, idx) => ({
        _id: e._id,
        labId: e.labId,
        subject: e.subject || e.department || lab.labName || 'General',
        experimentNo: parseInt(String(e.experimentNumber).replace(/\D/g, ''), 10) || (idx + 1),
        experimentName: e.experimentObject || e.experimentNumber,
        chemicals: (e.requiredInventory || []).map(c => ({
          chemicalName: c.chemicalName,
          quantityPerStudent: c.quantity || 1,
          unit: c.quantityUnit || 'mL'
        }))
      }));
    }
  }

  // Debug log always
  console.log('labId searched:', labIdParam);
  console.log('experiments found:', experiments.length);
  console.log('sample doc labId type:', experiments[0]?.labId, typeof experiments[0]?.labId);

  // Inventory lookup for stock status
  const inventory = await Inventory.find({}).lean();
  const enriched = experiments.map(exp => {
    let allAvailable = true;
    let anyAvailable = false;
    const expUnlocked = Boolean(exp.isUnlocked);
    exp.isUnlocked = expUnlocked;

    exp.chemicals = (exp.chemicals || []).map(chem => {
      const invItem = inventory.find(i => i.chemicalName?.toLowerCase() === chem.chemicalName?.toLowerCase());
      const stock = invItem ? invItem.quantity : 0;
      const reqQty = Number(chem.quantityPerStudent || chem.quantity || 1);
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
      return { 
        ...chem, 
        stock, 
        stockStatus,
        isUnlocked: typeof chem.isUnlocked === 'boolean' ? chem.isUnlocked : expUnlocked
      };
    });
    exp.status = exp.chemicals.length === 0 || allAvailable ? 'Available' : anyAvailable ? 'Low' : 'Out';
    return exp;
  });

  // Group by subject
  const grouped = {};
  enriched.forEach(exp => {
    const subjKey = exp.subject || 'General';
    if (!grouped[subjKey]) {
      grouped[subjKey] = [];
    }
    grouped[subjKey].push(exp);
  });

  // Fetch student requests
  let studentRequests = [];
  if (req.user) {
    studentRequests = await StudentRequest.find({ studentId: req.user.id }).sort({ requestedAt: -1 }).lean();
  }

  return res.json({
    success: true,
    totalExperiments: enriched.length,
    subjects: grouped,
    experiments: enriched,
    count: enriched.length,
    data: enriched,
    studentRequests,
    debug: {
      labIdSearched: labIdParam,
      totalFound: enriched.length
    }
  });
});

// @desc    Add single experiment manually (with upsert to prevent E11000 duplicate key error)
// @route   POST /api/lab/structure/experiment
// @access  Private (Lab Admin)
const addExperiment = asyncHandler(async (req, res) => {
  const { subject, experimentNo, experimentName, chemicals, labId } = req.body;
  const targetLabId = labId || req.body?.labId || req.user?.labId;

  let lab = null;
  if (targetLabId && mongoose.Types.ObjectId.isValid(targetLabId)) {
    lab = await Lab.findById(targetLabId);
  }
  if (!lab) {
    lab = await Lab.findOne({
      $or: [
        { admins: req.user._id },
        { adminEmail: req.user.email },
        { admin: req.user.name }
      ]
    });
  }

  if (!lab) {
    res.status(404);
    throw new Error('No target lab found to add experiment');
  }

  if (!subject || !experimentNo || !experimentName) {
    res.status(400);
    throw new Error('Please provide subject, experiment number, and name');
  }

  const labObjectId = new mongoose.Types.ObjectId(lab._id);
  const expNum = Number(experimentNo) || 1;

  // Clean and parse chemicals array
  const formattedChemicals = Array.isArray(chemicals) 
    ? chemicals.map(c => ({
        chemicalName: String(c.chemicalName || c.name || '').trim(),
        quantityPerStudent: Number(c.quantityPerStudent || c.quantity || 1),
        unit: String(c.unit || c.quantityUnit || 'mL').trim()
      })).filter(c => c.chemicalName !== '')
    : [];

  // Upsert: check if an experiment with this labId, subject, and experimentNo already exists
  let existing = await LabStructure.findOne({
    $or: [
      { labId: labObjectId },
      { labId: labObjectId.toString() }
    ],
    subject,
    experimentNo: expNum
  });

  if (existing) {
    existing.labId = labObjectId;
    existing.experimentName = experimentName;
    existing.chemicals = formattedChemicals;
    existing.updatedAt = Date.now();
    existing.uploadedBy = req.user._id || req.user.id;
    await existing.save();
    return res.status(200).json({ success: true, data: existing, message: 'Experiment updated successfully' });
  }

  const experiment = await LabStructure.create({
    labId: labObjectId,
    labName: lab.labName || lab.name,
    courseType: lab.courseType || 'B.Pharm',
    year: lab.year || '1',
    semester: lab.semester || '1',
    subject,
    experimentNo: expNum,
    experimentName,
    chemicals: formattedChemicals,
    uploadedBy: req.user._id || req.user.id
  });

  // Dual Save: Also populate Experiment collection in MongoDB
  try {
    const expNoStr = `Exp ${String(expNum).padStart(2, '0')}`;
    
    await Experiment.findOneAndUpdate(
      { labId: labObjectId, experimentNumber: expNoStr },
      {
        labId: labObjectId,
        experimentNumber: expNoStr,
        experimentObject: experimentName,
        subject: subject,
        department: subject,
        createdBy: req.user._id || req.user.id
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.log('Experiment model sync log:', e.message);
  }

  res.status(201).json({ success: true, data: experiment, message: 'Experiment created successfully' });
});

// @desc    Update single experiment
// @route   PUT /api/lab/structure/experiment/:id
// @access  Private (Lab Admin)
const updateExperiment = asyncHandler(async (req, res) => {
  const { subject, experimentNo, experimentName, chemicals } = req.body;
  
  const experiment = await LabStructure.findById(req.params.id);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  experiment.subject = subject || experiment.subject;
  experiment.experimentNo = experimentNo || experiment.experimentNo;
  experiment.experimentName = experimentName || experiment.experimentName;
  experiment.chemicals = chemicals || experiment.chemicals;
  experiment.updatedAt = Date.now();

  await experiment.save();

  res.status(200).json({ success: true, data: experiment });
});

// @desc    Delete single experiment
// @route   DELETE /api/lab/structure/experiment/:id
// @access  Private (Lab Admin)
const deleteExperiment = asyncHandler(async (req, res) => {
  const experiment = await LabStructure.findById(req.params.id);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  await experiment.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Get all lab structures / curriculum experiments across all labs and courses
// @route   GET /api/lab/structure/all
// @access  Private
const getAllStructures = asyncHandler(async (req, res) => {
  const structures = await LabStructure.find({}).sort({ courseType: 1, year: 1, semester: 1, subject: 1, experimentNo: 1 }).lean();
  res.status(200).json({ success: true, count: structures.length, data: structures });
});

// @desc    Toggle lock/unlock status for a single experiment
// @route   PUT /api/lab/structure/experiment/:id/lock
// @access  Private (Lab Admin)
const toggleExperimentLock = asyncHandler(async (req, res) => {
  const experiment = await LabStructure.findById(req.params.id);
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  const newStatus = typeof req.body.isUnlocked === 'boolean' ? req.body.isUnlocked : !experiment.isUnlocked;
  experiment.isUnlocked = newStatus;
  experiment.unlockedAt = newStatus ? new Date() : null;
  experiment.chemicals = (experiment.chemicals || []).map(c => {
    const obj = typeof c.toObject === 'function' ? c.toObject() : c;
    return { ...obj, isUnlocked: newStatus };
  });
  experiment.updatedAt = Date.now();
  await experiment.save();

  res.status(200).json({
    success: true,
    data: experiment,
    message: `Experiment ${newStatus ? 'UNLOCKED 🔓' : 'LOCKED 🔒'} successfully`
  });
});

// @desc    Toggle lock/unlock for a specific chemical within an experiment
// @route   PUT /api/lab/structure/experiment/:id/chemical-lock
// @access  Private (Lab Admin)
const toggleChemicalLockInExperiment = asyncHandler(async (req, res) => {
  const { chemicalName, isUnlocked } = req.body;
  const experiment = await LabStructure.findById(req.params.id);
  
  if (!experiment) {
    res.status(404);
    throw new Error('Experiment not found');
  }

  let found = false;
  experiment.chemicals = (experiment.chemicals || []).map(c => {
    const obj = typeof c.toObject === 'function' ? c.toObject() : c;
    if (obj.chemicalName?.toLowerCase() === chemicalName?.toLowerCase()) {
      found = true;
      const targetStatus = typeof isUnlocked === 'boolean' ? isUnlocked : !obj.isUnlocked;
      return { ...obj, isUnlocked: targetStatus };
    }
    return obj;
  });

  if (!found) {
    res.status(404);
    throw new Error(`Chemical "${chemicalName}" not found in experiment`);
  }

  const anyUnlocked = experiment.chemicals.some(c => c.isUnlocked);
  experiment.isUnlocked = anyUnlocked;
  experiment.updatedAt = Date.now();

  await experiment.save();

  res.status(200).json({
    success: true,
    data: experiment,
    message: `Chemical "${chemicalName}" lock status updated`
  });
});

// @desc    Bulk lock or unlock all experiments in a lab
// @route   PUT /api/lab/structure/lock-all
// @access  Private (Lab Admin)
const bulkToggleLock = asyncHandler(async (req, res) => {
  const { isUnlocked } = req.body;
  const lab = await resolveTargetLab(req);

  if (!lab) {
    res.status(404);
    throw new Error('No target lab found');
  }

  const queryIds = getLabIdQuery(lab._id);
  const targetUnlocked = typeof isUnlocked === 'boolean' ? isUnlocked : true;

  const docs = await LabStructure.find({ labId: { $in: queryIds } });
  for (const doc of docs) {
    doc.isUnlocked = targetUnlocked;
    doc.unlockedAt = targetUnlocked ? new Date() : null;
    doc.chemicals = (doc.chemicals || []).map(c => {
      const obj = typeof c.toObject === 'function' ? c.toObject() : c;
      return { ...obj, isUnlocked: targetUnlocked };
    });
    doc.updatedAt = Date.now();
    await doc.save();
  }

  const updatedDocs = await LabStructure.find({ labId: { $in: queryIds } }).sort({ subject: 1, experimentNo: 1 });

  res.status(200).json({
    success: true,
    count: updatedDocs.length,
    data: updatedDocs,
    message: `All experiments and chemicals ${targetUnlocked ? 'UNLOCKED 🔓' : 'LOCKED 🔒'} for today's practical session`
  });
});

module.exports = {
  uploadStructure,
  getStructure,
  getStudentStructure,
  getAllStructures,
  addExperiment,
  updateExperiment,
  deleteExperiment,
  toggleExperimentLock,
  toggleChemicalLockInExperiment,
  bulkToggleLock
};
