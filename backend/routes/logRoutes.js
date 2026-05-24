const express = require('express');
const { query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { getLogs } = require('../controllers/logController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['superAdmin', 'labAdmin']));

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isMongoId(),
  query('action').optional().isString().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], validateRequest, getLogs);

module.exports = router;
