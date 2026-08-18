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
  bulkToggleLock
} = require('../controllers/labStructureController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Require auth for all routes
router.use(authMiddleware);

// Routes
router.post('/upload', uploadStructure); // Ideally Lab Admin only, but controller handles auth implicitly by req.user.labId
router.get('/all', getAllStructures); // Super Admin & All Users
router.get('/', getStructure); // Lab Admin & Students
router.get('/student', getStudentStructure); // Students
router.get('/student/:labId', getStudentStructure); // Students for specific labId
router.post('/experiment', addExperiment);
router.put('/experiment/lock-all', bulkToggleLock);
router.put('/experiment/:id/chemical-lock', toggleChemicalLockInExperiment);
router.put('/experiment/:id/lock', toggleExperimentLock);
router.put('/experiment/:id', updateExperiment);
router.delete('/experiment/:id', deleteExperiment);

module.exports = router;
