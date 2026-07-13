const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/storeRequestController');

router.use(authMiddleware);

router.route('/requests')
  .post(roleMiddleware(['labAdmin', 'superAdmin']), createRequest)
  .get(roleMiddleware(['storeAdmin', 'superAdmin']), getAllRequests);

router.route('/requests/my')
  .get(roleMiddleware(['labAdmin', 'superAdmin']), getMyRequests);

router.route('/requests/:id/approve')
  .put(roleMiddleware(['storeAdmin', 'superAdmin']), approveRequest);

router.route('/requests/:id/reject')
  .put(roleMiddleware(['storeAdmin', 'superAdmin']), rejectRequest);

module.exports = router;
