const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createResult, createBulkResults, getStudentResults, getResults } = require('../controllers/examResultController');

const router = express.Router();

// SuperAdmin: enter results
router.post('/', authMiddleware, roleMiddleware(['superAdmin']), createResult);
router.post('/bulk', authMiddleware, roleMiddleware(['superAdmin']), createBulkResults);

// SuperAdmin: query all results
router.get('/', authMiddleware, roleMiddleware(['superAdmin']), getResults);

// Student can view own results, admin can view any student's results
router.get('/student/:studentId', authMiddleware, getStudentResults);

module.exports = router;
