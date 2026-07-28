const asyncHandler = require('express-async-handler');
const LabStructure = require('../models/LabStructure');
const Lab = require('../models/Lab');

const Inventory = require('../models/Inventory');

// @desc    Upload or update lab structure from CSV/Excel
// @route   POST /api/lab/structure/upload
// @access  Private (Lab Admin)
const uploadStructure = asyncHandler(async (req, res) => {
  const { structures } = req.body; // Array of experiments
  const labId = req.user.labId;

  if (!structures || !Array.isArray(structures) || structures.length === 0) {
    res.status(400);
    throw new Error('No structure data provided');
  }

  const lab = await Lab.findById(labId);
  if (!lab) {
    res.status(404);
    throw new Error('Lab not found');
  }

  const uploadedRecords = [];

  for (const exp of structures) {
    const { subject, experimentNo, experimentName, chemicals } = exp;

    if (!subject || !experimentNo || !experimentName) {
      continue; // Skip invalid rows
    }

    // Check if experiment already exists for this lab and subject
    const existing = await LabStructure.findOne({ labId, subject, experimentNo });

    if (existing) {
      // Smart merge: update chemicals list and name
      existing.experimentName = experimentName;
      existing.chemicals = chemicals;
      existing.updatedAt = Date.now();
      existing.uploadedBy = req.user.id;
      await existing.save();
      uploadedRecords.push(existing);
    } else {
      // Create new
      const newStructure = await LabStructure.create({
        labId,
        labName: lab.name || lab.labName,
        courseType: lab.courseType,
        year: lab.year,
        semester: lab.semester,
        subject,
        experimentNo,
        experimentName,
        chemicals,
        uploadedBy: req.user.id
      });
      uploadedRecords.push(newStructure);
    }
  }

  res.status(200).json({ success: true, count: uploadedRecords.length, data: uploadedRecords });
});

// @desc    Get lab structure
// @route   GET /api/lab/structure
// @access  Private (Lab Admin & Student)
const getStructure = asyncHandler(async (req, res) => {
  // If user is a student, they can only see their lab's structure.
  // If lab admin, they see the lab they are currently managing (passed in query or req.user.labId)
  
  const targetLabId = req.query.labId || req.user.labId;
  
  if (!targetLabId) {
    res.status(400);
    throw new Error('Lab ID is required to fetch structure');
  }

  const structure = await LabStructure.find({ labId: targetLabId }).sort({ subject: 1, experimentNo: 1 });
  res.status(200).json({ success: true, count: structure.length, data: structure });
});

// @desc    Get lab structure for student with inventory status
// @route   GET /api/lab/structure/student
// @access  Private (Student)
const getStudentStructure = asyncHandler(async (req, res) => {
  const targetLabId = req.user.labId;
  
  if (!targetLabId) {
    res.status(400);
    throw new Error('Student is not assigned to any lab');
  }

  const structure = await LabStructure.find({ labId: targetLabId }).lean().sort({ subject: 1, experimentNo: 1 });
  
  // Check inventory for each chemical in each experiment
  const inventory = await Inventory.find({ labId: targetLabId }).lean();
  
  const enrichedStructure = structure.map(exp => {
    let allAvailable = true;
    let anyAvailable = false;
    
    exp.chemicals = exp.chemicals.map(chem => {
      const invItem = inventory.find(i => i.chemicalName.toLowerCase() === chem.chemicalName.toLowerCase());
      const stock = invItem ? invItem.quantity : 0;
      
      let stockStatus = 'Out'; // Red
      if (stock >= chem.quantityPerStudent) {
        stockStatus = 'Available'; // Green
        anyAvailable = true;
      } else if (stock > 0) {
        stockStatus = 'Low'; // Yellow
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
    
    if (exp.chemicals.length === 0) {
      exp.status = 'Available'; // No chemicals needed
    } else if (allAvailable) {
      exp.status = 'Available';
    } else if (anyAvailable) {
      exp.status = 'Low';
    } else {
      exp.status = 'Out';
    }
    
    return exp;
  });

  res.status(200).json({ success: true, count: enrichedStructure.length, data: enrichedStructure });
});

// @desc    Add single experiment manually
// @route   POST /api/lab/structure/experiment
// @access  Private (Lab Admin)
const addExperiment = asyncHandler(async (req, res) => {
  const { subject, experimentNo, experimentName, chemicals } = req.body;
  const labId = req.user.labId;

  if (!subject || !experimentNo || !experimentName) {
    res.status(400);
    throw new Error('Please provide subject, experiment number, and name');
  }

  const existing = await LabStructure.findOne({ labId, subject, experimentNo });
  if (existing) {
    res.status(400);
    throw new Error('An experiment with this number already exists for this subject');
  }

  const lab = await Lab.findById(labId);

  const experiment = await LabStructure.create({
    labId,
    labName: lab.name || lab.labName,
    courseType: lab.courseType,
    year: lab.year,
    semester: lab.semester,
    subject,
    experimentNo,
    experimentName,
    chemicals: chemicals || [],
    uploadedBy: req.user.id
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

  if (experiment.labId.toString() !== req.user.labId.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this experiment');
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

  if (experiment.labId.toString() !== req.user.labId.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this experiment');
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
