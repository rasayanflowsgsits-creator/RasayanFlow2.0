const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  semester: { type: Number, required: true, min: 1, max: 8 },
  course: { type: String, required: true, enum: ['B.Pharm', 'M.Pharm'], default: 'B.Pharm' },
  year: { type: Number, required: true, min: 1, max: 4 },
  maxMarks: { type: Number, required: true, default: 100 },
  passingMarks: { type: Number, required: true, default: 40 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// A subject code must be unique per course
subjectSchema.index({ code: 1, course: 1 }, { unique: true });
subjectSchema.index({ semester: 1, course: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
