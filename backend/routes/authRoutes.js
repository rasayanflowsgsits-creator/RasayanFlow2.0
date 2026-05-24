const express = require('express');
const { body } = require('express-validator');
const { register, login, me, changePassword, refreshToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateMiddleware');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validateRequest,
  register,
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password required')],
  validateRequest,
  login,
);

router.get('/me', authMiddleware, me);

router.put(
  '/password',
  authMiddleware,
  passwordLimiter,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validateRequest,
  changePassword,
);

// Refresh access token
router.post('/refresh', [body('refreshToken').notEmpty().withMessage('refreshToken required')], validateRequest, refreshToken);

module.exports = router;
