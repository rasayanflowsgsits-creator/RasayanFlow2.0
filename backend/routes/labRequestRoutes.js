const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createRequest, getRequests, getMyRequests, approveRequest, rejectRequest } = require('../controllers/labRequestController');

const router = express.Router();

router.use(authMiddleware);

// Student routes
router.post('/', roleMiddleware(['student']), [
  body('labId').isMongoId(),
  body('labName').notEmpty(),
  body('chemicalName').notEmpty(),
  body('quantityRequested').isNumeric(),
  body('unit').notEmpty()
], validateRequest, createRequest);

router.get('/my', roleMiddleware(['student']), getMyRequests);

// Lab Admin routes
router.get('/', roleMiddleware(['labAdmin', 'superAdmin']), getRequests);

router.put('/:id/approve', roleMiddleware(['labAdmin', 'superAdmin']), [
  param('id').isMongoId()
], validateRequest, approveRequest);

router.put('/:id/reject', roleMiddleware(['labAdmin', 'superAdmin']), [
  param('id').isMongoId(),
  body('rejectionReason').notEmpty()
], validateRequest, rejectRequest);

module.exports = router;
