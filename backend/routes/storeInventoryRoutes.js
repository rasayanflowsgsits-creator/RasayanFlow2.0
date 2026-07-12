const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAllChemicals,
  importChemicals,
  updateChemical,
  deleteChemical
} = require('../controllers/storeInventoryController');

// Any logged in user can view the store inventory
router.route('/inventory')
  .get(protect, getAllChemicals);

// Store Admin only routes
router.route('/inventory/import')
  .post(protect, authorize('store-admin', 'super-admin'), importChemicals);

router.route('/inventory/:id')
  .put(protect, authorize('store-admin', 'super-admin'), updateChemical)
  .delete(protect, authorize('store-admin', 'super-admin'), deleteChemical);

module.exports = router;
