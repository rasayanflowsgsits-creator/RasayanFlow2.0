const asyncHandler = require('express-async-handler');
const LabStructure = require('../models/LabStructure');
const Lab = require('../models/Lab');
const Inventory = require('../models/Inventory');

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
  let targetId = req.body?.labId || req.query?.labId || req.user?.labId;
  if (targetId && targetId !== 'undefined' && targetId !== 'null') {
    const found = await Lab.findById(targetId);
    if (found) return found;
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

  for (const exp of structures) {
    const { subject, experimentNo, experimentName, chemicals } = exp;

    if (!subject || !experimentNo || !experimentName) {
      continue;
    }

    const existing = await LabStructure.findOne({ labId: lab._id, subject, experimentNo });

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
        experimentNo,
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

  let structure = await LabStructure.find({ labId: lab._id }).sort({ subject: 1, experimentNo: 1 });

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
        subject: subjName.includes('HAP') ? 'HAP1' : subjName,
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

// @desc    Get lab structure for student with inventory status
// @route   GET /api/lab/structure/student
// @access  Private (Student)
const getStudentStructure = asyncHandler(async (req, res) => {
  const lab = await resolveTargetLab(req);
  if (!lab) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  let structure = await LabStructure.find({ labId: lab._id }).lean().sort({ subject: 1, experimentNo: 1 });

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
        subject: subjName.includes('HAP') ? 'HAP1' : subjName,
        experimentNo: exp.experimentNo,
        experimentName: exp.experimentName,
        chemicals: exp.chemicals,
        uploadedBy: req.user._id || req.user.id
      });
      seeded.push(createdExp.toObject());
    }
    structure = seeded;
  }

  const inventory = await Inventory.find({ labId: lab._id }).lean();
  
  const enrichedStructure = structure.map(exp => {
    let allAvailable = true;
    let anyAvailable = false;
    
    exp.chemicals = (exp.chemicals || []).map(chem => {
      const invItem = inventory.find(i => i.chemicalName?.toLowerCase() === chem.chemicalName?.toLowerCase());
      const stock = invItem ? invItem.quantity : 100;
      
      let stockStatus = 'Out';
      if (stock >= chem.quantityPerStudent) {
        stockStatus = 'Available';
        anyAvailable = true;
      } else if (stock > 0) {
        stockStatus = 'Low';
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

  res.status(200).json({ success: true, count: enrichedStructure.length, data: enrichedStructure });
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
