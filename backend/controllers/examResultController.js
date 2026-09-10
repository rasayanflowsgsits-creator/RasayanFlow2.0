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
    const isLab = subject.type === 'lab';
    if (result) {
        // Update existing result
        result.isLab = isLab;
        if (isLab && req.body.experiments) {
            result.experiments = req.body.experiments;
        } else {
            result.marks = Number(marks);
        }
        result.maxMarks = subject.maxMarks;
        result.passingMarks = subject.passingMarks;
        result.enteredBy = req.user._id;
        await result.save();
    } else {
        const createObj = {
            studentId,
            subjectId,
            semester: subject.semester,
            course: subject.course,
            examSession,
            enteredBy: req.user._id,
            isLab,
        };
        if (isLab && req.body.experiments) {
            createObj.experiments = req.body.experiments;
        } else {
            createObj.marks = Number(marks);
        }
        createObj.maxMarks = subject.maxMarks;
        createObj.passingMarks = subject.passingMarks;

        result = await ExamResult.create(createObj);
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
            const isLab = subject.type === 'lab';
            if (result) {
                result.isLab = isLab;
                if (isLab && r.experiments) {
                    result.experiments = r.experiments;
                } else {
                    result.marks = Number(r.marks);
                }
                result.maxMarks = subject.maxMarks;
                result.passingMarks = subject.passingMarks;
                result.enteredBy = req.user._id;
                await result.save();
            } else {
                const createObj = {
                    studentId: r.studentId,
                    subjectId: r.subjectId,
                    semester: subject.semester,
                    course: subject.course,
                    examSession,
                    enteredBy: req.user._id,
                    isLab,
                };
                if (isLab && r.experiments) {
                    createObj.experiments = r.experiments;
                } else {
                    createObj.marks = Number(r.marks);
                }
                createObj.maxMarks = subject.maxMarks;
                createObj.passingMarks = subject.passingMarks;

                result = await ExamResult.create(createObj);
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
    if (semester) {
        const requestedSemester = Number(semester);
        const student = await User.findById(studentId).select('semester');
        const currentSemester = Number(student?.semester);

        // Keep failed lab results visible after promotion so the student can complete them
        // alongside the new semester. Theory results remain tied to their original semester.
        if (currentSemester > requestedSemester || !Number.isFinite(currentSemester)) {
            filter.semester = requestedSemester;
        } else if (currentSemester === requestedSemester) {
            filter.$or = [
                { semester: requestedSemester },
                { isLab: true, semester: { $lt: requestedSemester }, $or: [{ backlog: true }, { status: 'fail' }] },
            ];
        } else {
            filter.semester = requestedSemester;
        }
    }
    if (examSession) filter.examSession = examSession;

    const results = await ExamResult.find(filter)
        .populate('subjectId', 'name code maxMarks passingMarks semester type experiments')
        .sort({ semester: 1, createdAt: 1 });

    res.json({ success: true, data: results });
});

// @desc    Get results filtered by semester/course/session
// @route   GET /api/exam-results
// @access  superAdmin
const getResults = asyncHandler(async (req, res) => {
    const { semester, course, examSession, studentId } = req.query;
    const filter = {};
    if (semester) {
        const requestedSemester = Number(semester);
        // Include failed lab results from earlier semesters so super-admin can clear
        // carried lab backlogs while entering the promoted semester.
        if (!studentId && requestedSemester > 1) {
            filter.$or = [
                { semester: requestedSemester },
                { isLab: true, semester: { $lt: requestedSemester }, $or: [{ backlog: true }, { status: 'fail' }] },
            ];
        } else {
            filter.semester = requestedSemester;
        }
    }
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
