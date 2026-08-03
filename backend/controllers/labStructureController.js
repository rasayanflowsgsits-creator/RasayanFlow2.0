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
  const targetLabId = labId || req.body?.labId || req.user?.labId;

  let lab = null;
  if (targetLabId && mongoose.Types.ObjectId.isValid(targetLabId)) {
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

  const uploadedRecords = [];
  const labObjectId = new mongoose.Types.ObjectId(lab._id);

  for (const exp of structures) {
    const { subject, experimentNo, experimentName, chemicals } = exp;

    if (!subject || !experimentNo || !experimentName) {
      continue;
    }

    const existing = await LabStructure.findOne({ 
      $or: [
        { labId: labObjectId },
        { labId: labObjectId.toString() }
      ],
      subject, 
      experimentNo: Number(experimentNo) 
    });

    if (existing) {
      existing.labId = labObjectId;
      existing.experimentName = experimentName;
      existing.chemicals = chemicals || [];
      existing.updatedAt = Date.now();
      existing.uploadedBy = req.user._id || req.user.id;
      await existing.save();
      uploadedRecords.push(existing);
    } else {
      const newStructure = await LabStructure.create({
        labId: labObjectId,
        labName: lab.labName || lab.name,
        courseType: lab.courseType || 'B.Pharm',
        year: lab.year || '1',
        semester: lab.semester || '1',
        subject,
        experimentNo: Number(experimentNo),
        experimentName,
        chemicals: chemicals || [],
        uploadedBy: req.user._id || req.user.id
      });
      uploadedRecords.push(newStructure);
    }

    // Dual Save: Also populate Experiment collection in MongoDB
    try {
      const expNoStr = `Exp ${String(experimentNo).padStart(2, '0')}`;
      const reqInv = (chemicals || []).map(c => ({
        chemicalName: c.chemicalName,
        quantity: Number(c.quantityPerStudent || c.quantity || 1),
        quantityUnit: c.unit || c.quantityUnit || 'g'
      }));

      await Experiment.findOneAndUpdate(
        { labId: labObjectId, experimentNumber: expNoStr },
        {
          labId: labObjectId,
          experimentNumber: expNoStr,
          experimentObject: experimentName,
          subject: subject,
          department: subject,
          requiredInventory: reqInv,
          createdBy: req.user._id || req.user.id
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.log('Experiment model sync log:', e.message);
    }
  }

  res.status(200).json({ success: true, count: uploadedRecords.length, data: uploadedRecords });
});

// @desc    Get lab structure with automatic HAP1 auto-seeding
// @route   GET /api/lab/structure
// @access  Private (Lab Admin & Student)
const getStructure = asyncHandler(async (req, res) => {
  const lab = await resolveTargetLab(req);

  if (!lab) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const queryIds = getLabIdQuery(lab._id);
  let structure = await LabStructure.find({ labId: { $in: queryIds } }).sort({ subject: 1, experimentNo: 1 });

  // Fallback match by labName / course
  if (structure.length === 0) {
    structure = await LabStructure.find({
      $or: [
        { labName: lab.labName || lab.name },
        { courseType: lab.courseType, year: lab.year, semester: lab.semester }
      ]
    }).sort({ subject: 1, experimentNo: 1 });
  }

  // Auto-seed default HAP1 experiments if 0 experiments exist for this lab
  if (structure.length === 0) {
    const seeded = [];
    const subjName = lab.labName || lab.name || 'HAP1 (Human Anatomy & Physiology I)';
    
    for (const exp of DEFAULT_HAP1_EXPERIMENTS) {
      const createdExp = await LabStructure.create({
        labId: lab._id,
        labName: subjName,
        courseType: lab.courseType || 'B.Pharm',
        year: lab.year || '1',
        semester: lab.semester || '1',
        subject: subjName.includes('HAP') ? 'HAP - I' : subjName,
        experimentNo: exp.experimentNo,
        experimentName: exp.experimentName,
        chemicals: exp.chemicals,
        uploadedBy: req.user._id || req.user.id
      });
      seeded.push(createdExp);
    }
    structure = seeded;
  }

  res.status(200).json({ success: true, count: structure.length, data: structure });
});

// @desc    Get lab structure for student with inventory status & requests
// @route   GET /api/lab/structure/student/:labId
// @access  Private (Student)
const getStudentStructure = asyncHandler(async (req, res) => {
  const labIdParam = req.params?.labId || req.query?.labId || req.body?.labId || req.user?.labId;

  // Try all possible formats
  let experiments = [];

  // Attempt 1: Direct string match
  if (labIdParam) {
    experiments = await LabStructure.find({ labId: labIdParam }).lean().sort({ subject: 1, experimentNo: 1 });
  }

  // Attempt 2: If empty, try ObjectId
  if (experiments.length === 0 && labIdParam) {
    try {
      if (mongoose.Types.ObjectId.isValid(labIdParam)) {
        const objectId = new mongoose.Types.ObjectId(labIdParam);
        experiments = await LabStructure.find({ labId: objectId }).lean().sort({ subject: 1, experimentNo: 1 });
      }
    } catch (e) {
      console.log('ObjectId conversion failed:', e.message);
    }
  }

  // Attempt 3: If still empty, try string on _id / .toString()
  if (experiments.length === 0 && labIdParam) {
    experiments = await LabStructure.find({ labId: labIdParam.toString() }).lean().sort({ subject: 1, experimentNo: 1 });
  }

  // Attempt 4: Also query Experiment model (from Experiment Manager) using the same 3 fallbacks
  let dbExps = [];
  if (labIdParam) {
    dbExps = await Experiment.find({ labId: labIdParam }).lean().sort({ experimentNumber: 1 });
    if (dbExps.length === 0 && mongoose.Types.ObjectId.isValid(labIdParam)) {
      try {
        dbExps = await Experiment.find({ labId: new mongoose.Types.ObjectId(labIdParam) }).lean().sort({ experimentNumber: 1 });
      } catch (e) {}
    }
    if (dbExps.length === 0) {
      dbExps = await Experiment.find({ labId: labIdParam.toString() }).lean().sort({ experimentNumber: 1 });
    }
  }

  if (dbExps.length > 0) {
    const mapped = dbExps.map(exp => ({
      _id: exp._id,
      id: exp._id,
      labId: exp.labId,
      subject: exp.subject || exp.department || 'Organic Chemistry',
      experimentNo: parseInt(exp.experimentNumber, 10) || 1,
      experimentName: exp.experimentObject || exp.experimentName || 'Experiment',
      chemicals: (exp.requiredInventory || []).map(r => ({
        chemicalName: r.chemicalName,
        quantityPerStudent: r.quantity,
        unit: r.quantityUnit || 'mL'
      }))
    }));

    mapped.forEach(m => {
      if (!experiments.some(s => s.experimentName === m.experimentName && Number(s.experimentNo) === Number(m.experimentNo))) {
        experiments.push(m);
      }
    });
  }

  // Attempt 5: Fallback search by resolved target lab or any experiments in MongoDB
  if (experiments.length === 0) {
    const targetLab = await resolveTargetLab(req);
    if (targetLab) {
      const byName = await LabStructure.find({
        $or: [
          { labId: targetLab._id },
          { labName: { $regex: new RegExp(`^${targetLab.labName || targetLab.name}`, 'i') } },
          { courseType: targetLab.courseType, year: targetLab.year, semester: targetLab.semester }
        ]
      }).lean().sort({ subject: 1, experimentNo: 1 });
      experiments = byName;
    }

    if (experiments.length === 0) {
      experiments = await LabStructure.find({}).lean().sort({ subject: 1, experimentNo: 1 });
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
      return { ...chem, stock, stockStatus };
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
    lab = await Lab.findOne({ assignedLabAdmin: req.user._id });
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

module.exports = {
  uploadStructure,
  getStructure,
  getStudentStructure,
  addExperiment,
  updateExperiment,
  deleteExperiment
};
