const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { evaluateOne, evaluateBatch, applyPromotions, getPromotionHistory } = require('../controllers/promotionController');

const router = express.Router();

// SuperAdmin: evaluate and apply promotions
router.get('/evaluate/:studentId', authMiddleware, roleMiddleware(['superAdmin']), evaluateOne);
router.post('/evaluate-batch', authMiddleware, roleMiddleware(['superAdmin']), evaluateBatch);
router.post('/apply', authMiddleware, roleMiddleware(['superAdmin']), applyPromotions);

// Student can view own history, admin can view any student's history
router.get('/history/:studentId', authMiddleware, getPromotionHistory);

module.exports = router;
