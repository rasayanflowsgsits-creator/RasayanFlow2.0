const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs, updateLab } = require('../controllers/labController');

const router = express.Router();

const { getExperimentsByLab } = require('../controllers/experimentController');

router.get('/', authMiddleware, listLabs);
router.get('/matching', authMiddleware, getMatchingLabs);
router.get('/student/labs', authMiddleware, getMatchingLabs);
router.get('/:labId/experiments', authMiddleware, getExperimentsByLab);

router.use(authMiddleware, roleMiddleware(['superAdmin']));

router.post(
  '/',
  [
    body('labName').notEmpty(),
    body('labCode').notEmpty(),
    body('courseType').optional().isString(),
    body('department').optional().isString(),
    body('year').optional().isString(),
    body('semester').optional().isString(),
  ],
  validateRequest,
  createLab,
);

router.put(
  '/:labId',
  [
    param('labId').isMongoId(),
    body('labName').optional().isString(),
    body('labCode').optional().isString(),
    body('courseType').optional().isString(),
    body('department').optional().isString(),
    body('year').optional().isString(),
    body('semester').optional().isString(),
  ],
  validateRequest,
  updateLab,
);

router.post(
  '/assign',
  [
    body('labId').notEmpty(),
    body('adminId').optional({ checkFalsy: true }).isString(),
    body('email').optional({ checkFalsy: true }).isEmail(),
    body('name').optional({ checkFalsy: true }).isString(),
    body('password').optional({ checkFalsy: true }).isString(),
  ],
  validateRequest,
  assignAdmin,
);

router.post(
  '/remove',
  [body('labId').notEmpty(), body('adminId').isString()],
  validateRequest,
  removeAdmin,
);

router.put('/approve/:adminId', [param('adminId').isMongoId()], validateRequest, approveAdmin);
router.delete('/:labId', [param('labId').isMongoId()], validateRequest, deleteLab);

module.exports = router;
