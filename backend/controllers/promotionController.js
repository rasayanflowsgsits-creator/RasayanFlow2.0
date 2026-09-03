const asyncHandler = require('express-async-handler');
const ExamResult = require('../models/ExamResult');
const Subject = require('../models/Subject');
const User = require('../models/User');
const PromotionRecord = require('../models/PromotionRecord');
const ActivityLog = require('../models/ActivityLog');

/**
 * Helper: evaluate promotion for a single student
 * Returns the evaluation object (does NOT save anything)
 */
const evaluateStudent = async (student, examSession) => {
    const semester = Number(student.semester);
    const course = student.course || 'B.Pharm';

    // Get all active subjects for this semester + course
    const subjects = await Subject.find({ semester, course, isActive: true });
    const totalSubjects = subjects.length;

    if (totalSubjects === 0) {
        return {
            studentId: student._id,
            studentName: student.name,
            rollNumber: student.rollNumber,
            semester,
            course,
            totalSubjects: 0,
            passedSubjects: 0,
            failedSubjects: 0,
            decision: null,
            message: 'No subjects found for this semester/course',
            results: [],
            backlogs: [],
        };
    }

    // Get results for this student in this semester + session
    const results = await ExamResult.find({
        studentId: student._id,
        semester,
        examSession,
    }).populate('subjectId', 'name code maxMarks passingMarks');

    const passedSubjects = results.filter((r) => r.status === 'pass').length;
    const failedSubjects = results.filter((r) => r.status === 'fail').length;
    const attemptedSubjects = results.length;

    // Subjects not yet attempted (no result entered)
    const unattempted = totalSubjects - attemptedSubjects;
    // Treat unattempted as failed for decision purposes
    const effectiveFailCount = failedSubjects + unattempted;

    // Decision: if failed > half of total → sem-back
    const halfThreshold = totalSubjects / 2;
    let decision;
    if (effectiveFailCount > halfThreshold) {
        decision = 'sem-back';
    } else {
        decision = 'promoted';
    }

    // Collect backlog subject IDs (failed subjects)
    const backlogs = results
        .filter((r) => r.status === 'fail')
        .map((r) => ({ subjectId: r.subjectId._id, name: r.subjectId.name, code: r.subjectId.code }));

    return {
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        semester,
        course,
        totalSubjects,
        attemptedSubjects,
        passedSubjects,
        failedSubjects: effectiveFailCount,
        decision,
        results: results.map((r) => ({
            subjectName: r.subjectId.name,
            subjectCode: r.subjectId.code,
            marks: r.marks,
            maxMarks: r.maxMarks,
            passingMarks: r.passingMarks,
            status: r.status,
        })),
        backlogs,
    };
};

// @desc    Preview promotion decision for a single student (dry-run)
// @route   GET /api/promotions/evaluate/:studentId
// @access  superAdmin
const evaluateOne = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { examSession } = req.query;

    if (!examSession) {
        res.status(400);
        throw new Error('examSession query parameter is required');
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
        res.status(404);
        throw new Error('Student not found');
    }

    const evaluation = await evaluateStudent(student, examSession);
    res.json({ success: true, data: evaluation });
});

// @desc    Evaluate all students of a semester/course/session
// @route   POST /api/promotions/evaluate-batch
// @access  superAdmin
const evaluateBatch = asyncHandler(async (req, res) => {
    const { semester, course, examSession } = req.body;

    if (!semester || !course || !examSession) {
        res.status(400);
        throw new Error('semester, course, and examSession are required');
    }

    const students = await User.find({
        role: 'student',
        semester: String(semester),
        course,
    });

    const evaluations = [];
    for (const student of students) {
        const evaluation = await evaluateStudent(student, examSession);
        evaluations.push(evaluation);
    }

    res.json({ success: true, data: evaluations });
});

// @desc    Apply promotion decisions (updates User.semester & User.year)
// @route   POST /api/promotions/apply
// @access  superAdmin
const applyPromotions = asyncHandler(async (req, res) => {
    const { decisions, examSession } = req.body;
    // decisions = [{ studentId, decision: 'promoted' | 'sem-back' }, ...]

    if (!decisions || !Array.isArray(decisions) || decisions.length === 0 || !examSession) {
        res.status(400);
        throw new Error('decisions array and examSession are required');
    }

    const results = [];

    for (const d of decisions) {
        const student = await User.findById(d.studentId);
        if (!student || student.role !== 'student') {
            results.push({ studentId: d.studentId, error: 'Student not found' });
            continue;
        }

        const evaluation = await evaluateStudent(student, examSession);
        const decision = d.decision || evaluation.decision;

        const fromSemester = Number(student.semester);
        const fromYear = Number(student.year) || Math.ceil(fromSemester / 2);
        let toSemester, toYear;

        if (decision === 'promoted') {
            const maxSem = student.course === 'M.Pharm' ? 4 : 8;
            toSemester = Math.min(fromSemester + 1, maxSem);
            toYear = Math.ceil(toSemester / 2);
        } else {
            // sem-back: stay in the same semester
            toSemester = fromSemester;
            toYear = fromYear;
        }

        // Create promotion record
        const record = await PromotionRecord.create({
            studentId: student._id,
            fromSemester,
            toSemester,
            fromYear,
            toYear,
            course: student.course || 'B.Pharm',
            decision,
            totalSubjects: evaluation.totalSubjects,
            passedSubjects: evaluation.passedSubjects,
            failedSubjects: evaluation.failedSubjects,
            backlogs: evaluation.backlogs.map((b) => b.subjectId),
            examSession,
            decidedBy: req.user._id,
        });

        // Update student's semester and year
        student.semester = String(toSemester);
        student.year = String(toYear);
        await student.save();

        await ActivityLog.create({
            userId: req.user._id,
            action: decision === 'promoted' ? 'promote_student' : 'sem_back_student',
            details: `${decision === 'promoted' ? 'Promoted' : 'Sem-back'} ${student.name} (${student.rollNumber}) from Sem ${fromSemester} → Sem ${toSemester}`,
            entityType: 'promotion',
            entityId: record._id,
        });

        results.push({
            studentId: student._id,
            studentName: student.name,
            rollNumber: student.rollNumber,
            decision,
            fromSemester,
            toSemester,
            fromYear,
            toYear,
        });
    }

    res.json({ success: true, data: results });
});

// @desc    Get promotion history for a student
// @route   GET /api/promotions/history/:studentId
// @access  student (own) or superAdmin
const getPromotionHistory = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    // Students can only see their own history
    if (req.user.role === 'student' && String(req.user._id) !== String(studentId)) {
        res.status(403);
        throw new Error('You can only view your own promotion history');
    }

    const records = await PromotionRecord.find({ studentId })
        .populate('backlogs', 'name code')
        .populate('decidedBy', 'name')
        .sort({ createdAt: -1 });

    res.json({ success: true, data: records });
});

module.exports = { evaluateOne, evaluateBatch, applyPromotions, getPromotionHistory };
