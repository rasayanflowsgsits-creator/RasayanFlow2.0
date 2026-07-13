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
  .get(roleMiddleware(['storeAdmin', 'superAdmin', 'labAdmin']), getAllChemicals);

router.route('/inventory/import')
  .post(roleMiddleware(['storeAdmin', 'superAdmin']), importChemicals);

router.route('/inventory/:id')
  .put(roleMiddleware(['storeAdmin', 'superAdmin']), updateChemical)
  .delete(roleMiddleware(['storeAdmin', 'superAdmin']), deleteChemical);

module.exports = router;
