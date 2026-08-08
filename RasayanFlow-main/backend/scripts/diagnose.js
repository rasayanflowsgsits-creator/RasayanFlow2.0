/**
 * DIAGNOSTIC: Print all Labs, LabStructure docs labId fields, and compare.
 * Run: node backend/scripts/diagnose.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const Lab = require('../models/Lab');
  const LabStructure = require('../models/LabStructure');
  const User = require('../models/User');

  // 1. Print all Labs
  const labs = await Lab.find({}).lean();
  console.log(`=== LABS (${labs.length} total) ===`);
  labs.forEach(l => {
    console.log(`  Lab: "${l.labName}" | _id: ${l._id} | type: ${typeof l._id} | code: ${l.labCode} | year: ${l.year} | sem: ${l.semester} | courseType: ${l.courseType}`);
  });

  // 2. Print all LabStructure docs
  const structs = await LabStructure.find({}).lean();
  console.log(`\n=== LAB STRUCTURE EXPERIMENTS (${structs.length} total) ===`);
  structs.slice(0, 20).forEach(s => {
    console.log(`  Exp: "${s.experimentName}" | labId: ${s.labId} | labId type: ${typeof s.labId} | subject: ${s.subject}`);
  });

  // 3. Match check
  console.log('\n=== MATCH CHECK ===');
  labs.forEach(lab => {
    const matched = structs.filter(s => String(s.labId) === String(lab._id));
    console.log(`  Lab "${lab.labName}" (${lab._id}) -> ${matched.length} experiments in LabStructure`);
  });

  // 4. Print lab admin users
  const admins = await User.find({ role: 'labAdmin' }).lean();
  console.log(`\n=== LAB ADMINS (${admins.length}) ===`);
  admins.forEach(a => {
    console.log(`  ${a.email} | labId: ${a.labId} | year: ${a.year} | sem: ${a.semester}`);
  });

  // 5. Print students
  const students = await User.find({ role: 'student', year: { $ne: null } }).lean();
  console.log(`\n=== STUDENTS WITH YEAR SET (${students.length}) ===`);
  students.slice(0, 10).forEach(s => {
    console.log(`  ${s.email} | course: ${s.course} | year: ${s.year} | sem: ${s.semester}`);
  });

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
