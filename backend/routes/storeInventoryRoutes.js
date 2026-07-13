const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllChemicals,
  importChemicals,
  updateChemical,
  deleteChemical
} = require('../controllers/storeInventoryController');

router.use(authMiddleware);

router.route('/inventory')
  .get(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin', 'labAdmin']), getAllChemicals);

router.route('/inventory/import')
  .post(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), importChemicals);

router.route('/inventory/:id')
  .put(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), updateChemical)
  .delete(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), deleteChemical);

module.exports = router;
