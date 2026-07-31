const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  action: { type: String, required: true },
  details: { type: String },
  role: { type: String, default: 'student' },
  userName: { type: String, default: 'User' },
  userEmail: { type: String, default: '' },
  labName: { type: String, default: '-' },
  courseType: { type: String, default: '-' },
  year: { type: String, default: '-' },
  semester: { type: String, default: '-' },
  status: { type: String, default: 'Success' },
  entityType: { type: String, default: '' },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
