const express = require('express');
const {
  createRequest,
  getMyRequests,
  getLabRequests,
  approveRequest,
  rejectRequest,
  getStudentHistory,
  getLabHistory
} = require('../controllers/studentRequestController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Student routes
router.post('/', createRequest);
router.get('/my', getMyRequests);
router.get('/history', getStudentHistory);

// Lab Admin routes
router.get('/lab', getLabRequests);
router.get('/lab-history', getLabHistory);
router.put('/:id/approve', approveRequest);
router.put('/:id/reject', rejectRequest);

module.exports = router;
