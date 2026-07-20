const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/storeNotificationController');

router.use(authMiddleware);

// All notification routes are protected (any logged in user)
router.route('/')
  .get(getNotifications);

router.route('/unread-count')
  .get(getUnreadCount);

router.route('/read-all')
  .put(markAllAsRead);

router.route('/:id/read')
  .put(markAsRead);

module.exports = router;
