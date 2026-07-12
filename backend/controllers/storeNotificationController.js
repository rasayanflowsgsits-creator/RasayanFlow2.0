const StoreNotification = require('../models/StoreNotification');
const asyncHandler = require('express-async-handler');

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await StoreNotification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('labId', 'name labName labCode');
  res.status(200).json(notifications);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await StoreNotification.findById(req.params.id);
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  if (notification.userId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('User not authorized');
  }

  notification.isRead = true;
  await notification.save();
  res.status(200).json(notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await StoreNotification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.status(200).json({ message: 'All notifications marked as read' });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
