const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/storeRequestController');

router.route('/requests')
  .post(protect, authorize('lab-admin', 'super-admin'), createRequest)
  .get(protect, authorize('store-admin', 'super-admin'), getAllRequests);

router.route('/requests/my')
  .get(protect, authorize('lab-admin', 'super-admin'), getMyRequests);

router.route('/requests/:id/approve')
  .put(protect, authorize('store-admin', 'super-admin'), approveRequest);

router.route('/requests/:id/reject')
  .put(protect, authorize('store-admin', 'super-admin'), rejectRequest);

module.exports = router;
