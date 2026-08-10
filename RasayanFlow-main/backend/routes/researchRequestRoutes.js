const express = require('express');
const {
  createResearchRequest,
  getMyResearchRequests
} = require('../controllers/researchRequestController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createResearchRequest);
router.get('/my', getMyResearchRequests);

module.exports = router;
