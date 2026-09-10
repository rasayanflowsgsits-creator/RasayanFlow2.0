const mongoose = require('mongoose');

const promotionRecordSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromSemester: { type: Number, required: true },
    toSemester: { type: Number, required: true },
    fromYear: { type: Number, required: true },
    toYear: { type: Number, required: true },
    course: { type: String, required: true },
    decision: { type: String, enum: ['promoted', 'sem-back'], required: true },
    totalSubjects: { type: Number, required: true },
    passedSubjects: { type: Number, required: true },
    failedSubjects: { type: Number, required: true },
    backlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    examSession: { type: String, required: true, trim: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

promotionRecordSchema.index({ studentId: 1, examSession: 1 });
promotionRecordSchema.index({ examSession: 1, course: 1 });

module.exports = mongoose.model('PromotionRecord', promotionRecordSchema);
