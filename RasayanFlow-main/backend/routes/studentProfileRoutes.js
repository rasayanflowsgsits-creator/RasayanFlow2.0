const express = require('express');
const { setupProfile, getProfile } = require('../controllers/studentProfileController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.put('/setup', setupProfile);
router.post('/setup', setupProfile);
router.put('/', setupProfile);
router.post('/', setupProfile);
router.get('/', getProfile);

module.exports = router;
