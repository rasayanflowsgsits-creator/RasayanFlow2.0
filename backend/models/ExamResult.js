const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    semester: { type: Number, required: true },
    course: { type: String, required: true },
    marks: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, default: 100 },
    passingMarks: { type: Number, required: true, default: 40 },
    // For labs, `isLab` will be true and `experiments` will contain per-experiment marks.
    isLab: { type: Boolean, default: false },
    experiments: [
        {
            name: { type: String },
            marks: { type: Number, min: 0 },
            maxMarks: { type: Number },
            passingMarks: { type: Number },
            status: { type: String, enum: ['pass', 'fail'] },
        },
    ],
    status: { type: String, enum: ['pass', 'fail'], required: true },
    // If a student fails a lab (any experiment fail), mark as backlog so promotion logic can carry it forward
    backlog: { type: Boolean, default: false },
    examSession: { type: String, required: true, trim: true }, // e.g. "2026-Jan", "2026-May"
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// One result per student per subject per exam session
examResultSchema.index({ studentId: 1, subjectId: 1, examSession: 1 }, { unique: true });
examResultSchema.index({ studentId: 1, semester: 1 });
examResultSchema.index({ examSession: 1, semester: 1, course: 1 });

// Auto-set status based on marks vs passingMarks before validation
examResultSchema.pre('validate', function (next) {
    // Compute status/backlog for theory or lab
    if (this.isLab) {
        // If experiments are provided, evaluate each
        let anyFail = false;
        let totalMarks = 0;
        let totalMax = 0;
        let totalPassing = 0;
        if (Array.isArray(this.experiments) && this.experiments.length > 0) {
            this.experiments = this.experiments.map((e) => {
                const em = { ...e };
                if (em.marks !== undefined && em.passingMarks !== undefined) {
                    em.status = em.marks >= em.passingMarks ? 'pass' : 'fail';
                    if (em.status === 'fail') anyFail = true;
                }
                if (em.marks) totalMarks += Number(em.marks);
                if (em.maxMarks) totalMax += Number(em.maxMarks);
                if (em.passingMarks) totalPassing += Number(em.passingMarks);
                return em;
            });
            // Derive overall marks/max/passing if not explicitly set
            if (!this.marks && totalMarks) this.marks = totalMarks;
            if (!this.maxMarks && totalMax) this.maxMarks = totalMax;
            if (!this.passingMarks && totalPassing) this.passingMarks = totalPassing;
        } else {
            // No per-experiment details supplied: fall back to whole-lab marks comparison
            if (this.marks !== undefined && this.passingMarks !== undefined) {
                anyFail = !(this.marks >= this.passingMarks);
            }
        }
        this.status = anyFail ? 'fail' : 'pass';
        this.backlog = anyFail;
    } else {
        if (this.marks !== undefined && this.passingMarks !== undefined) {
            this.status = this.marks >= this.passingMarks ? 'pass' : 'fail';
            this.backlog = this.status === 'fail';
        }
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ExamResult', examResultSchema);
