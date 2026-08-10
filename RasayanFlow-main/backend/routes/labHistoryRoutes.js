const express = require('express');
const { param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getLabHistory, getStudentHistory } = require('../controllers/labHistoryController');

const router = express.Router();

router.use(authMiddleware);

// Lab Admin views full lab history
router.get('/', roleMiddleware(['labAdmin', 'superAdmin']), getLabHistory);

// Lab Admin or Student views student history
router.get('/student/:studentId', [
  param('studentId').isMongoId()
], validateRequest, getStudentHistory);

// Student views own history
router.get('/my', roleMiddleware(['student']), getStudentHistory);

module.exports = router;
