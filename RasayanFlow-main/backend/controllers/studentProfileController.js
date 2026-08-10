const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Lab = require('../models/Lab');

// @desc    Complete student profile setup (onboarding)
// @route   PUT /api/student/profile/setup
// @access  Private (Student)
const setupProfile = asyncHandler(async (req, res) => {
  const { rollNumber, course, year, semester } = req.body;

  const userId = req.user._id || req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.rollNumber = rollNumber || user.rollNumber;
  user.course = course || user.course || 'B.Pharm';
  user.year = String(year || user.year || '1');
  user.semester = String(semester || user.semester || '1');
  user.onboardingComplete = true;

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      course: user.course,
      year: user.year,
      semester: user.semester,
      rollNumber: user.rollNumber,
      onboardingComplete: user.onboardingComplete
    }
  });
});

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private (Student)
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

module.exports = {
  setupProfile,
  getProfile
};
