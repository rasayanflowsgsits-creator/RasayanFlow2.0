const express = require('express');
const {
  uploadStructure,
  getStructure,
  getStudentStructure,
  getAllStructures,
  addExperiment,
  updateExperiment,
  deleteExperiment,
  toggleExperimentLock,
  toggleChemicalLockInExperiment,
  bulkToggleLock,
  markExperimentComplete,
  getProgressStats
} = require('../controllers/labStructureController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Require auth for all routes
router.use(authMiddleware);

// Routes
router.post('/upload', uploadStructure);
router.get('/all', getAllStructures);
router.get('/progress', getProgressStats);       // NEW: Super Admin progress stats
router.get('/', getStructure);
router.get('/student', getStudentStructure);
router.get('/student/:labId', getStudentStructure);
router.post('/experiment', addExperiment);
router.put('/experiment/lock-all', bulkToggleLock);
router.put('/experiment/:id/complete', markExperimentComplete);   // NEW: Lab Admin mark done
router.put('/experiment/:id/chemical-lock', toggleChemicalLockInExperiment);
router.put('/experiment/:id/lock', toggleExperimentLock);
router.put('/experiment/:id', updateExperiment);
router.delete('/experiment/:id', deleteExperiment);

module.exports = router;

