const mongoose = require('mongoose');

const storeNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab"
  },
  type: {
    type: String,
    enum: ["request_approved", "request_rejected", "low_stock"]
  },
  message: { type: String, required: true },
  chemicalName: { type: String },
  quantity: { type: Number },
  unit: { type: String },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StoreRequest"
  },
  receiptNumber: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreNotification', storeNotificationSchema);
