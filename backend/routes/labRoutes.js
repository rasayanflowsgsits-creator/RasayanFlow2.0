const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { createLab, listLabs, assignAdmin, removeAdmin, approveAdmin, deleteLab, getMatchingLabs } = require('../controllers/labController');

const router = express.Router();

router.get('/', authMiddleware, listLabs);
router.get('/matching', authMiddleware, getMatchingLabs);

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

router.post(
  '/assign',
  [body('labId').isMongoId(), body('adminId').isMongoId()],
  validateRequest,
  assignAdmin,
);

router.post(
  '/remove',
  [body('labId').isMongoId(), body('adminId').isMongoId()],
  validateRequest,
  removeAdmin,
);

router.put('/approve/:adminId', [param('adminId').isMongoId()], validateRequest, approveAdmin);
router.delete('/:labId', [param('labId').isMongoId()], validateRequest, deleteLab);

module.exports = router;
