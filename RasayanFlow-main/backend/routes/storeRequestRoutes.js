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

router.route('/')
  .post(roleMiddleware(['labAdmin', 'superAdmin']), createRequest)
  .get(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), getAllRequests);

router.route('/my')
  .get(roleMiddleware(['labAdmin', 'superAdmin']), getMyRequests);

router.route('/:id/approve')
  .put(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), approveRequest);

router.route('/:id/reject')
  .put(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), rejectRequest);

module.exports = router;
