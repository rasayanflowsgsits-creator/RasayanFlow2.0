const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory,
  bulkImport
} = require('../controllers/storeInventoryController');

router.use(authMiddleware);

router.route('/inventory')
  .get(roleMiddleware(['storeAdmin', 'superAdmin', 'labAdmin']), getInventory)
  .post(roleMiddleware(['storeAdmin', 'superAdmin']), addInventory);

router.route('/inventory/import')
  .post(roleMiddleware(['storeAdmin', 'superAdmin']), bulkImport);

router.route('/inventory/:id')
  .put(roleMiddleware(['storeAdmin', 'superAdmin']), updateInventory)
  .delete(roleMiddleware(['storeAdmin', 'superAdmin']), deleteInventory);

module.exports = router;
