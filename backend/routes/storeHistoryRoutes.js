const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getHistory } = require('../controllers/storeHistoryController');

router.route('/history')
  .get(protect, authorize('store-admin', 'super-admin'), getHistory);

module.exports = router;
