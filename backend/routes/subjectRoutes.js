const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/subjectController');

const router = express.Router();

// All authenticated users can view subjects
router.get('/', authMiddleware, getSubjects);

// Only superAdmin can create/update/delete subjects
router.post('/', authMiddleware, roleMiddleware(['superAdmin']), createSubject);
router.put('/:id', authMiddleware, roleMiddleware(['superAdmin']), updateSubject);
router.delete('/:id', authMiddleware, roleMiddleware(['superAdmin']), deleteSubject);

module.exports = router;
