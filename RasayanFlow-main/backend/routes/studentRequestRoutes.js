const express = require('express');
const {
  createRequest,
  getMyRequests,
  getStudentRequestsForLab,
  getLabRequests,
  approveBulk,
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
router.get('/lab/:labId', getStudentRequestsForLab);

// Lab Admin routes
router.get('/lab', getLabRequests);
router.get('/student-requests', getLabRequests);
router.get('/lab-history', getLabHistory);
router.put('/approve-bulk', approveBulk);
router.put('/:id/approve', approveRequest);
router.put('/:id/reject', rejectRequest);

module.exports = router;
