const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Lab = require('./models/Lab');
const User = require('./models/User');
const LabStructure = require('./models/LabStructure');
const StudentRequest = require('./models/StudentRequest');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pharmlab').then(async () => {
  console.log("Connected to DB");
  
  // Find pharmaceutics-1 lab
  const lab = await Lab.findOne({ name: "pharmaceutics-1" });
  if (!lab) {
    console.log("Lab 'pharmaceutics-1' not found! Make sure you spelled it exactly as in the DB.");
    process.exit(1);
  }

  // Ensure a dummy student exists
  let student = await User.findOne({ email: "dummy.student@example.com" });
  if (!student) {
    student = await User.create({
      name: "Dummy Student",
      email: "dummy.student@example.com",
      password: "hashedpassword123", // Doesn't matter, just for seeding
      role: "student",
      course: "B.Pharm",
      year: "Year 1",
      semester: "Sem 1",
      group: "Group A",
      rollNumber: "BP001",
      labId: lab._id,
      labName: lab.name
    });
  }

  // Clear existing lab structure for this lab to avoid duplicates
  await LabStructure.deleteMany({ labId: lab._id });

  // Insert dummy experiments
  const exp1 = await LabStructure.create({
    labId: lab._id,
    subject: "Pharmaceutical Analysis",
    experimentNo: 1,
    experimentName: "Preparation of 0.1 N HCl",
    chemicals: [
      { chemicalName: "Hydrochloric Acid", quantityPerStudent: 5, unit: "ml" },
      { chemicalName: "Distilled Water", quantityPerStudent: 100, unit: "ml" }
    ]
  });

  const exp2 = await LabStructure.create({
    labId: lab._id,
    subject: "Pharmaceutical Analysis",
    experimentNo: 2,
    experimentName: "Standardization of NaOH",
    chemicals: [
      { chemicalName: "Sodium Hydroxide", quantityPerStudent: 2, unit: "g" },
      { chemicalName: "Phenolphthalein", quantityPerStudent: 0.5, unit: "ml" }
    ]
  });

  // Clear existing requests for this lab
  await StudentRequest.deleteMany({ labId: lab._id });

  // Insert a dummy student request
  await StudentRequest.create({
    requestId: "REQ-DUMMY-" + Date.now(),
    studentId: student._id,
    studentName: student.name,
    rollNumber: student.rollNumber,
    group: student.group,
    labId: lab._id,
    labName: lab.name,
    year: lab.year,
    semester: lab.semester,
    subject: exp1.subject,
    experimentNo: exp1.experimentNo,
    experimentName: exp1.experimentName,
    chemicalsRequested: [
      { chemicalName: "Hydrochloric Acid", quantityRequested: 5, unit: "ml", status: "Pending" },
      { chemicalName: "Distilled Water", quantityRequested: 100, unit: "ml", status: "Pending" }
    ],
    overallStatus: "Pending",
    requestedAt: new Date()
  });

  console.log("Dummy data seeded successfully for lab:", lab.name);
  process.exit(0);
}).catch(console.error);
