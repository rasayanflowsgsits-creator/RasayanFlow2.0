const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    semester: { type: Number, required: true },
    course: { type: String, required: true },
    marks: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, default: 100 },
    passingMarks: { type: Number, required: true, default: 40 },
    status: { type: String, enum: ['pass', 'fail'], required: true },
    examSession: { type: String, required: true, trim: true }, // e.g. "2026-Jan", "2026-May"
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// One result per student per subject per exam session
examResultSchema.index({ studentId: 1, subjectId: 1, examSession: 1 }, { unique: true });
examResultSchema.index({ studentId: 1, semester: 1 });
examResultSchema.index({ examSession: 1, semester: 1, course: 1 });

// Auto-set status based on marks vs passingMarks
examResultSchema.pre('save', function (next) {
    this.status = this.marks >= this.passingMarks ? 'pass' : 'fail';
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ExamResult', examResultSchema);
