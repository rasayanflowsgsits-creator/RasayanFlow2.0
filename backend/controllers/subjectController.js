const asyncHandler = require('express-async-handler');
const Subject = require('../models/Subject');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get subjects (filter by semester, course)
// @route   GET /api/subjects
// @access  Authenticated
const getSubjects = asyncHandler(async (req, res) => {
    const { semester, course, isActive } = req.query;
    const filter = {};
    if (semester) filter.semester = Number(semester);
    if (course) filter.course = course;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const subjects = await Subject.find(filter).sort({ semester: 1, code: 1 });
    res.json({ success: true, data: subjects });
});

// @desc    Create a new subject
// @route   POST /api/subjects
// @access  superAdmin
const createSubject = asyncHandler(async (req, res) => {
    const { name, code, semester, course, year, maxMarks, passingMarks } = req.body;

    if (!name || !code || !semester || !course || !year) {
        res.status(400);
        throw new Error('name, code, semester, course, and year are required');
    }

    const existing = await Subject.findOne({ code: code.toUpperCase(), course });
    if (existing) {
        res.status(400);
        throw new Error(`Subject with code ${code} already exists for ${course}`);
    }

    const subject = await Subject.create({
        name,
        code: code.toUpperCase(),
        semester: Number(semester),
        course,
        year: Number(year),
        maxMarks: maxMarks || 100,
        passingMarks: passingMarks || 40,
        createdBy: req.user._id,
    });

    await ActivityLog.create({
        userId: req.user._id,
        action: 'create_subject',
        details: `Created subject ${subject.code} - ${subject.name} for ${course} Sem ${semester}`,
        entityType: 'subject',
        entityId: subject._id,
    });

    res.status(201).json({ success: true, data: subject });
});

// @desc    Update a subject
// @route   PUT /api/subjects/:id
// @access  superAdmin
const updateSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    const { name, code, semester, course, year, maxMarks, passingMarks, isActive } = req.body;
    if (name !== undefined) subject.name = name;
    if (code !== undefined) subject.code = code.toUpperCase();
    if (semester !== undefined) subject.semester = Number(semester);
    if (course !== undefined) subject.course = course;
    if (year !== undefined) subject.year = Number(year);
    if (maxMarks !== undefined) subject.maxMarks = Number(maxMarks);
    if (passingMarks !== undefined) subject.passingMarks = Number(passingMarks);
    if (isActive !== undefined) subject.isActive = Boolean(isActive);

    await subject.save();

    await ActivityLog.create({
        userId: req.user._id,
        action: 'update_subject',
        details: `Updated subject ${subject.code} - ${subject.name}`,
        entityType: 'subject',
        entityId: subject._id,
    });

    res.json({ success: true, data: subject });
});

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
// @access  superAdmin
const deleteSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    await Subject.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
        userId: req.user._id,
        action: 'delete_subject',
        details: `Deleted subject ${subject.code} - ${subject.name}`,
        entityType: 'subject',
        entityId: subject._id,
    });

    res.json({ success: true, message: 'Subject deleted' });
});

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
