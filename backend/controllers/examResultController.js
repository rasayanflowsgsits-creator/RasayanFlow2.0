const asyncHandler = require('express-async-handler');
const ExamResult = require('../models/ExamResult');
const Subject = require('../models/Subject');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Enter result for one student + one subject
// @route   POST /api/exam-results
// @access  superAdmin
const createResult = asyncHandler(async (req, res) => {
    const { studentId, subjectId, marks, examSession } = req.body;

    if (!studentId || !subjectId || marks === undefined || !examSession) {
        res.status(400);
        throw new Error('studentId, subjectId, marks, and examSession are required');
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
        res.status(404);
        throw new Error('Student not found');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    // Check if result already exists for this student + subject + session
    let result = await ExamResult.findOne({ studentId, subjectId, examSession });
    if (result) {
        // Update existing result
        result.marks = Number(marks);
        result.maxMarks = subject.maxMarks;
        result.passingMarks = subject.passingMarks;
        result.enteredBy = req.user._id;
        await result.save();
    } else {
        result = await ExamResult.create({
            studentId,
            subjectId,
            semester: subject.semester,
            course: subject.course,
            marks: Number(marks),
            maxMarks: subject.maxMarks,
            passingMarks: subject.passingMarks,
            examSession,
            enteredBy: req.user._id,
        });
    }

    await ActivityLog.create({
        userId: req.user._id,
        action: 'enter_exam_result',
        details: `Entered result for student ${student.name} in ${subject.code}: ${marks}/${subject.maxMarks}`,
        entityType: 'exam_result',
        entityId: result._id,
    });

    res.status(201).json({ success: true, data: result });
});

// @desc    Bulk upload results for multiple students
// @route   POST /api/exam-results/bulk
// @access  superAdmin
const createBulkResults = asyncHandler(async (req, res) => {
    const { results, examSession } = req.body;
    // results = [{ studentId, subjectId, marks }, ...]

    if (!results || !Array.isArray(results) || results.length === 0 || !examSession) {
        res.status(400);
        throw new Error('results array and examSession are required');
    }

    const saved = [];
    const errors = [];

    for (const r of results) {
        try {
            const subject = await Subject.findById(r.subjectId);
            if (!subject) {
                errors.push({ ...r, error: 'Subject not found' });
                continue;
            }

            let result = await ExamResult.findOne({
                studentId: r.studentId,
                subjectId: r.subjectId,
                examSession,
            });

            if (result) {
                result.marks = Number(r.marks);
                result.maxMarks = subject.maxMarks;
                result.passingMarks = subject.passingMarks;
                result.enteredBy = req.user._id;
                await result.save();
            } else {
                result = await ExamResult.create({
                    studentId: r.studentId,
                    subjectId: r.subjectId,
                    semester: subject.semester,
                    course: subject.course,
                    marks: Number(r.marks),
                    maxMarks: subject.maxMarks,
                    passingMarks: subject.passingMarks,
                    examSession,
                    enteredBy: req.user._id,
                });
            }
            saved.push(result);
        } catch (err) {
            errors.push({ ...r, error: err.message });
        }
    }

    await ActivityLog.create({
        userId: req.user._id,
        action: 'bulk_enter_exam_results',
        details: `Bulk entered ${saved.length} results for session ${examSession}`,
    });

    res.status(201).json({ success: true, data: { saved: saved.length, errors } });
});

// @desc    Get results for a specific student
// @route   GET /api/exam-results/student/:studentId
// @access  student (own) or superAdmin
const getStudentResults = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { semester, examSession } = req.query;

    // Students can only see their own results
    if (req.user.role === 'student' && String(req.user._id) !== String(studentId)) {
        res.status(403);
        throw new Error('You can only view your own results');
    }

    const filter = { studentId };
    if (semester) filter.semester = Number(semester);
    if (examSession) filter.examSession = examSession;

    const results = await ExamResult.find(filter)
        .populate('subjectId', 'name code maxMarks passingMarks semester')
        .sort({ semester: 1, createdAt: 1 });

    res.json({ success: true, data: results });
});

// @desc    Get results filtered by semester/course/session
// @route   GET /api/exam-results
// @access  superAdmin
const getResults = asyncHandler(async (req, res) => {
    const { semester, course, examSession, studentId } = req.query;
    const filter = {};
    if (semester) filter.semester = Number(semester);
    if (course) filter.course = course;
    if (examSession) filter.examSession = examSession;
    if (studentId) filter.studentId = studentId;

    const results = await ExamResult.find(filter)
        .populate('studentId', 'name email rollNumber')
        .populate('subjectId', 'name code maxMarks passingMarks')
        .sort({ createdAt: -1 });

    res.json({ success: true, data: results });
});

module.exports = { createResult, createBulkResults, getStudentResults, getResults };
