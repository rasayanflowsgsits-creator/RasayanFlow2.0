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
  const { structures } = req.body;
  const lab = await resolveTargetLab(req);

  if (!lab) {
    res.status(404);
    throw new Error('No target lab found for experiment upload');
  }

  if (!structures || !Array.isArray(structures) || structures.length === 0) {
    res.status(400);
    throw new Error('No structure data provided');
  }

  const uploadedRecords = [];
  const queryIds = getLabIdQuery(lab._id);

  for (const exp of structures) {
    const { subject, experimentNo, experimentName, chemicals } = exp;

    if (!subject || !experimentNo || !experimentName) {
      continue;
    }

    const existing = await LabStructure.findOne({ 
      labId: { $in: queryIds }, 
      subject, 
      experimentNo: Number(experimentNo) 
    });

    if (existing) {
      existing.experimentName = experimentName;
      existing.chemicals = chemicals || [];
      existing.updatedAt = Date.now();
      existing.uploadedBy = req.user._id || req.user.id;
      await existing.save();
      uploadedRecords.push(existing);
    } else {
      const newStructure = await LabStructure.create({
        labId: lab._id,
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
  const targetId = req.params?.labId || req.query?.labId || req.body?.labId || req.user?.labId;
  console.log('Student fetching experiments for labId:', targetId);

  let targetLab = null;
  if (targetId && targetId !== 'undefined' && targetId !== 'null') {
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      targetLab = await Lab.findById(targetId);
    }
    if (!targetLab) {
      targetLab = await Lab.findOne({ $or: [{ labCode: targetId }, { name: targetId }, { labName: targetId }] });
    }
  }

  if (!targetLab) {
    targetLab = await resolveTargetLab(req);
  }

  // Find linked Lab Admins for this lab
  let adminUserIds = [];
  if (targetLab) {
    const admins = await User.find({
      $or: [
        { labId: targetLab._id },
        { email: targetLab.adminEmail },
        { _id: { $in: targetLab.admins || [] } }
      ]
    }).select('_id');
    adminUserIds = admins.map(u => u._id);
  }

  // Construct dynamic $or search conditions
  const searchOrs = [];
  if (targetId) {
    searchOrs.push({ labId: targetId });
    searchOrs.push({ labId: targetId.toString() });
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      searchOrs.push({ labId: new mongoose.Types.ObjectId(targetId) });
    }
  }
  if (targetLab) {
    searchOrs.push({ labId: targetLab._id });
    searchOrs.push({ labId: targetLab._id.toString() });
    if (targetLab.labName || targetLab.name) {
      searchOrs.push({ labName: { $regex: new RegExp(`^${targetLab.labName || targetLab.name}`, 'i') } });
    }
  }
  if (adminUserIds.length > 0) {
    searchOrs.push({ uploadedBy: { $in: adminUserIds } });
    searchOrs.push({ createdBy: { $in: adminUserIds } });
  }

  const queryFilter = searchOrs.length > 0 ? { $or: searchOrs } : {};

  // 1. Fetch from LabStructure collection
  let structure = await LabStructure.find(queryFilter).lean().sort({ subject: 1, experimentNo: 1 });

  // 2. Fetch from Experiment collection (created by Lab Admin Experiment Manager)
  const dbExperiments = await Experiment.find(queryFilter).lean().sort({ experimentNumber: 1 });
  
  if (dbExperiments.length > 0) {
    const mappedDbExperiments = dbExperiments.map(exp => ({
      _id: exp._id,
      id: exp._id,
      labId: exp.labId,
      subject: exp.subject || exp.department || targetLab?.labName || targetLab?.name || 'Lab Experiments',
      experimentNo: parseInt(exp.experimentNumber, 10) || 1,
      experimentName: exp.experimentObject || exp.experimentName || 'Experiment',
      chemicals: (exp.requiredInventory || []).map(r => ({
        chemicalName: r.chemicalName,
        quantityPerStudent: r.quantity,
        unit: r.quantityUnit || 'mL'
      }))
    }));

    mappedDbExperiments.forEach(m => {
      if (!structure.some(s => s.experimentName === m.experimentName && Number(s.experimentNo) === Number(m.experimentNo))) {
        structure.push(m);
      }
    });
  }

  // If still no experiments found specifically for this lab, query all experiments in database matching lab course/year/sem or created by any lab admin
  if (structure.length === 0 && targetLab) {
    const fallbackStructures = await LabStructure.find({
      $or: [
        { courseType: targetLab.courseType, year: targetLab.year, semester: targetLab.semester },
        { courseType: targetLab.courseType }
      ]
    }).lean().sort({ subject: 1, experimentNo: 1 });

    const fallbackExps = await Experiment.find({}).lean().sort({ experimentNumber: 1 });
    structure = [...fallbackStructures];

    fallbackExps.forEach(exp => {
      const m = {
        _id: exp._id,
        id: exp._id,
        labId: exp.labId,
        subject: exp.subject || exp.department || targetLab?.labName || targetLab?.name || 'Lab Practical',
        experimentNo: parseInt(exp.experimentNumber, 10) || 1,
        experimentName: exp.experimentObject || exp.experimentName || 'Experiment',
        chemicals: (exp.requiredInventory || []).map(r => ({
          chemicalName: r.chemicalName,
          quantityPerStudent: r.quantity,
          unit: r.quantityUnit || 'mL'
        }))
      };
      if (!structure.some(s => s.experimentName === m.experimentName)) {
        structure.push(m);
      }
    });
  }

  console.log('Total dynamic experiments found for student:', structure.length);

  // Fetch Inventory for Stock Status calculation
  const inventory = await Inventory.find(queryFilter).lean();

  const enrichedStructure = structure.map(exp => {
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
      
      return {
        ...chem,
        stock,
        stockStatus
      };
    });
    
    exp.status = exp.chemicals.length === 0 || allAvailable ? 'Available' : anyAvailable ? 'Low' : 'Out';
    return exp;
  });

  // Group experiments dynamically by subject
  const subjectsGrouped = {};
  enrichedStructure.forEach(exp => {
    const subjKey = exp.subject || targetLab?.labName || targetLab?.name || 'General';
    if (!subjectsGrouped[subjKey]) {
      subjectsGrouped[subjKey] = [];
    }
    subjectsGrouped[subjKey].push(exp);
  });

  // Fetch student requests
  let studentRequests = [];
  if (req.user) {
    studentRequests = await StudentRequest.find({
      studentId: req.user.id
    }).sort({ requestedAt: -1 }).lean();
  }

  res.status(200).json({
    success: true,
    labId: targetId,
    totalExperiments: enrichedStructure.length,
    subjects: subjectsGrouped,
    experiments: enrichedStructure,
    lab: targetLab ? {
      _id: targetLab._id,
      id: targetLab._id,
      name: targetLab.name || targetLab.labName,
      labName: targetLab.labName || targetLab.name,
      labCode: targetLab.labCode || '0001',
      courseType: targetLab.courseType || 'B.Pharm',
      year: targetLab.year || '1',
      semester: targetLab.semester || '1',
      admin: targetLab.admin || 'user10',
      adminEmail: targetLab.adminEmail || 'user10@gmail.com',
      admins: targetLab.admins || [],
      department: targetLab.department || 'Pharmaceutics'
    } : null,
    count: enrichedStructure.length,
    data: enrichedStructure,
    studentRequests
  });
});

// @desc    Add single experiment manually
// @route   POST /api/lab/structure/experiment
// @access  Private (Lab Admin)
const addExperiment = asyncHandler(async (req, res) => {
  const { subject, experimentNo, experimentName, chemicals } = req.body;
  const lab = await resolveTargetLab(req);

  if (!lab) {
    res.status(404);
    throw new Error('No target lab found to add experiment');
  }

  if (!subject || !experimentNo || !experimentName) {
    res.status(400);
    throw new Error('Please provide subject, experiment number, and name');
  }

  const experiment = await LabStructure.create({
    labId: lab._id,
    labName: lab.labName || lab.name,
    courseType: lab.courseType || 'B.Pharm',
    year: lab.year || '1',
    semester: lab.semester || '1',
    subject,
    experimentNo: Number(experimentNo) || 1,
    experimentName,
    chemicals: chemicals || [],
    uploadedBy: req.user._id || req.user.id
  });

  res.status(201).json({ success: true, data: experiment });
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
