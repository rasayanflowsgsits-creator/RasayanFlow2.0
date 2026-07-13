const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getHistory } = require('../controllers/storeHistoryController');

router.use(authMiddleware);

router.route('/history')
  .get(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), getHistory);

module.exports = router;
