const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getStoreOverview } = require('../controllers/superAdminController');

router.use(authMiddleware, roleMiddleware(['superAdmin', 'super_admin']));

router.get('/store-overview', getStoreOverview);

module.exports = router;
