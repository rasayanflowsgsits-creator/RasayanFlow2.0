const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const storeInventoryController = require('../controllers/storeInventoryController');

router.use(authMiddleware);

router.route('/')
  .get(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin', 'labAdmin']), (req, res, next) => storeInventoryController.getAllChemicals(req, res, next));

router.route('/import')
  .post(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), (req, res, next) => storeInventoryController.importChemicals(req, res, next));

router.route('/:id')
  .put(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), (req, res, next) => storeInventoryController.updateChemical(req, res, next))
  .delete(roleMiddleware(['storeAdmin', 'store_admin', 'superAdmin']), (req, res, next) => storeInventoryController.deleteChemical(req, res, next));

module.exports = router;
