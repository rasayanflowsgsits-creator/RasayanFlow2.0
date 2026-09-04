const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  me,
  changePassword,
  refreshToken,
  updateStudentOnboarding,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
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
router.put('/onboarding', authMiddleware, updateStudentOnboarding);
router.post('/onboarding', authMiddleware, updateStudentOnboarding);
router.put('/profile', authMiddleware, updateStudentOnboarding);
router.post('/profile', authMiddleware, updateStudentOnboarding);

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

// Forgot password
router.post(
  '/forgot-password',
  passwordLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email required')
      .normalizeEmail(),
  ],
  validateRequest,
  forgotPassword,
);
// Reset password using reset token
router.post(
  '/reset-password',
  passwordLimiter,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),

    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password min 6 chars'),
  ],
  validateRequest,
  resetPassword,
);

// Refresh access token
router.post('/refresh', [body('refreshToken').notEmpty().withMessage('refreshToken required')], validateRequest, refreshToken);

module.exports = router;
