const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createExperiment, getExperiments, deleteExperiment, bulkImportExperiments } = require('../controllers/experimentController');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  [query('labId').optional().isMongoId(), query('search').optional().isString()],
  validateRequest,
  getExperiments
);

router.post(
  '/bulk-import',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    body('labId').isMongoId(),
    body('experiments').isArray({ min: 1 }),
  ],
  validateRequest,
  bulkImportExperiments
);

router.post(
  '/',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [
    body('labId').isMongoId(),
    body('experimentNumber').notEmpty().isString(),
    body('experimentObject').notEmpty(),
    body('requiredInventory').isArray({ min: 1 }),
    body('requiredInventory.*.inventoryItemId').isMongoId(),
    body('requiredInventory.*.quantity').isFloat({ gt: 0 }),
    body('requiredInventory.*.quantityUnit').optional().isString(),
  ],
  validateRequest,
  createExperiment
);

router.delete(
  '/:id',
  roleMiddleware(['superAdmin', 'labAdmin']),
  [param('id').isMongoId()],
  validateRequest,
  deleteExperiment
);

module.exports = router;
