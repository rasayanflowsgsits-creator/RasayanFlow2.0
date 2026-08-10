require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pharmlab';
    await mongoose.connect(mongoUri);
    console.log('--- DB CONNECTED ---');

    const Lab = require('../models/Lab');
    const User = require('../models/User');
    const LabStructure = require('../models/LabStructure');
    const Experiment = require('../models/Experiment');

    // 1. Lab Document
    const sampleLab = await Lab.findOne({}).lean();
    console.log('\n=== QUESTION 1: LAB DOCUMENT ===');
    if (sampleLab) {
      console.log('Sample Lab Doc:', JSON.stringify(sampleLab, null, 2));
      console.log('_id:', sampleLab._id, '| type:', typeof sampleLab._id, '| constructor:', sampleLab._id.constructor.name);
      console.log('courseType:', sampleLab.courseType, '| type:', typeof sampleLab.courseType);
      console.log('year:', sampleLab.year, '| type:', typeof sampleLab.year);
      console.log('semester:', sampleLab.semester, '| type:', typeof sampleLab.semester);
    } else {
      console.log('No lab document found in database.');
    }

    // 2. Student User Document
    const sampleStudent = await User.findOne({ role: 'student' }).lean();
    console.log('\n=== QUESTION 2: STUDENT USER DOCUMENT ===');
    if (sampleStudent) {
      console.log('Sample Student Doc:', JSON.stringify(sampleStudent, null, 2));
      console.log('course:', sampleStudent.course, '| type:', typeof sampleStudent.course);
      console.log('year:', sampleStudent.year, '| type:', typeof sampleStudent.year);
      console.log('semester:', sampleStudent.semester, '| type:', typeof sampleStudent.semester);
    } else {
      console.log('No student user document found in database.');
    }

    // 3. Lab Admin Document & labId
    const sampleLabAdmin = await User.findOne({ role: 'labAdmin' }).lean();
    console.log('\n=== QUESTION 5: LAB ADMIN USER DOCUMENT ===');
    if (sampleLabAdmin) {
      console.log('Sample Lab Admin Email:', sampleLabAdmin.email);
      console.log('labId:', sampleLabAdmin.labId, '| type:', typeof sampleLabAdmin.labId, sampleLabAdmin.labId ? sampleLabAdmin.labId.constructor.name : 'N/A');
    } else {
      console.log('No lab admin user document found in database.');
    }

    // 4. LabStructure / Experiment Document
    const sampleStruct = await LabStructure.findOne({}).lean();
    console.log('\n=== QUESTION 4: EXPERIMENT / LAB STRUCTURE DOCUMENT ===');
    if (sampleStruct) {
      console.log('Sample LabStructure Doc:', JSON.stringify(sampleStruct, null, 2));
      console.log('labId:', sampleStruct.labId, '| type:', typeof sampleStruct.labId, sampleStruct.labId ? sampleStruct.labId.constructor.name : 'N/A');
    } else {
      console.log('No LabStructure document found in database.');
    }

    // Print all labs count & details
    const allLabs = await Lab.find({}).lean();
    console.log(`\n=== TOTAL LABS IN DB: ${allLabs.length} ===`);
    allLabs.forEach((l, idx) => {
      console.log(`[Lab ${idx + 1}] _id: ${l._id} (${l._id.constructor.name}) | labName: "${l.labName}" | courseType: "${l.courseType}" | year: "${l.year}" (${typeof l.year}) | semester: "${l.semester}" (${typeof l.semester})`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Diagnostic error:', err);
  }
}

run();
