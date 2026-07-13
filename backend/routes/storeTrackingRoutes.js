const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getTrackingLogs } = require('../controllers/storeTrackingController');

// All tracking routes require auth and storeAdmin/superAdmin/labAdmin roles
router.use(authMiddleware);
router.use(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin', 'super-admin', 'labAdmin', 'lab-admin']));

router.route('/')
  .get(getTrackingLogs);

module.exports = router;
