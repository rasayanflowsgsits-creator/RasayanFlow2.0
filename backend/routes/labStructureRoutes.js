const express = require('express');
const {
  uploadStructure,
  getStructure,
  getStudentStructure,
  addExperiment,
  updateExperiment,
  deleteExperiment
} = require('../controllers/labStructureController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Require auth for all routes
router.use(authMiddleware);

// Routes
router.post('/upload', uploadStructure); // Ideally Lab Admin only, but controller handles auth implicitly by req.user.labId
router.get('/', getStructure); // Lab Admin & Students
router.get('/student', getStudentStructure); // Students
router.post('/experiment', addExperiment);
router.put('/experiment/:id', updateExperiment);
router.delete('/experiment/:id', deleteExperiment);

module.exports = router;
