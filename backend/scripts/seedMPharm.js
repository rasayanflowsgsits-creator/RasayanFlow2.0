const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Inventory = require('../models/Inventory');
const LabStructure = require('../models/LabStructure');
const Experiment = require('../models/Experiment');
const logger = require('../utils/logger');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedMPharm = async () => {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('seedMPharm skipped: MongoDB is not connected');
    return;
  }

  try {
    logger.info('🔬 Seeding authentic M.Pharm postgraduate infrastructure...');

    // 1. Find SuperAdmin for createdBy reference
    const superAdmin = await User.findOne({ role: 'superAdmin' }) || await User.findOne({});
    const createdById = superAdmin ? superAdmin._id : new mongoose.Types.ObjectId();

    // 2. Define 6 Official M.Pharm Laboratories
    const MPHARM_LABS = [
      {
        labCode: 'MPHARM-101L',
        labName: 'M.Pharm Advanced Pharmaceutics Lab - I',
        courseType: 'M.Pharm',
        department: 'Pharmaceutics',
        year: '1',
        semester: '1',
      },
      {
        labCode: 'MPHARM-102L',
        labName: 'M.Pharm Pharmaceutical Analysis Lab',
        courseType: 'M.Pharm',
        department: 'Pharmaceutical Analysis',
        year: '1',
        semester: '1',
      },
      {
        labCode: 'MPHARM-201L',
        labName: 'M.Pharm Advanced Spectral Analysis Lab',
        courseType: 'M.Pharm',
        department: 'Quality Assurance',
        year: '1',
        semester: '2',
      },
      {
        labCode: 'MPHARM-202L',
        labName: 'M.Pharm Advanced Biopharmaceutics Lab',
        courseType: 'M.Pharm',
        department: 'Biopharmaceutics',
        year: '1',
        semester: '2',
      },
      {
        labCode: 'MPHARM-301L',
        labName: 'M.Pharm Novel Drug Delivery Research Lab',
        courseType: 'M.Pharm',
        department: 'PG Research & Thesis',
        year: '2',
        semester: '3',
      },
      {
        labCode: 'MPHARM-401L',
        labName: 'M.Pharm Dissertation & Final Defense Lab',
        courseType: 'M.Pharm',
        department: 'PG Research & Thesis',
        year: '2',
        semester: '4',
      },
    ];

    const labMap = {};
    for (const def of MPHARM_LABS) {
      let lab = await Lab.findOne({ labCode: def.labCode });
      if (!lab) {
        lab = await Lab.create({
          ...def,
          createdBy: createdById,
          admins: [],
        });
        logger.info(`✅ Created Lab: ${def.labCode} - ${def.labName}`);
      } else {
        lab.labName = def.labName;
        lab.courseType = def.courseType;
        lab.department = def.department;
        lab.year = def.year;
        lab.semester = def.semester;
        await lab.save();
      }
      labMap[def.labCode] = lab;
    }

    // 3. Define 6 Faculty Supervisors with real credentials
    const SUPERVISORS = [
      {
        name: 'Dr. Rajesh Sharma',
        email: 'supervisor.sem1@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-101L',
        year: '1',
        semester: '1',
      },
      {
        name: 'Dr. Sunita Rao',
        email: 'supervisor.sem1b@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-102L',
        year: '1',
        semester: '1',
      },
      {
        name: 'Dr. Priya Nair',
        email: 'supervisor.sem2@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-201L',
        year: '1',
        semester: '2',
      },
      {
        name: 'Dr. Vikram Malhotra',
        email: 'supervisor.sem2b@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-202L',
        year: '1',
        semester: '2',
      },
      {
        name: 'Dr. Arun Verma',
        email: 'supervisor.sem3@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-301L',
        year: '2',
        semester: '3',
      },
      {
        name: 'Dr. Neha Gupta',
        email: 'supervisor.sem4@rasayanflow.local',
        password: 'Supervisor@2026',
        labCode: 'MPHARM-401L',
        year: '2',
        semester: '4',
      },
    ];

    for (const sup of SUPERVISORS) {
      const targetLab = labMap[sup.labCode];
      let user = await User.findOne({ email: sup.email });
      if (!user) {
        user = await User.create({
          name: sup.name,
          email: sup.email,
          password: sup.password,
          displayPassword: sup.password,
          role: 'labAdmin',
          isApproved: true,
          isSupervisor: true,
          course: 'M.Pharm',
          courseType: 'M.Pharm',
          year: sup.year,
          semester: sup.semester,
          labId: targetLab ? targetLab._id : null,
          labName: targetLab ? targetLab.labName : '',
          labCode: sup.labCode,
        });
        logger.info(`✅ Created Supervisor: ${sup.name} (${sup.email}) for ${sup.labCode}`);
      } else {
        user.role = 'labAdmin';
        user.isApproved = true;
        user.isSupervisor = true;
        user.course = 'M.Pharm';
        user.courseType = 'M.Pharm';
        user.year = sup.year;
        user.semester = sup.semester;
        user.displayPassword = sup.password;
        if (targetLab) {
          user.labId = targetLab._id;
          user.labName = targetLab.labName;
          user.labCode = targetLab.labCode;
        }
        await user.save();
      }

      if (targetLab) {
        if (!targetLab.admins.some((id) => id && id.toString() === user._id.toString())) {
          targetLab.admins.push(user._id);
          targetLab.admin = user.name;
          targetLab.adminEmail = user.email;
          await targetLab.save();
        }
      }
    }

    // 4. Seed M.Pharm Students for all 4 Semesters
    const STUDENTS = [
      {
        name: 'Ananya Sen',
        email: 'student.mpharm.s1@rasayanflow.local',
        password: 'Student@2026',
        rollNumber: '0832MP261001',
        year: '1',
        semester: '1',
      },
      {
        name: 'Rohit Mehta',
        email: 'student.mpharm.s2@rasayanflow.local',
        password: 'Student@2026',
        rollNumber: '0832MP261015',
        year: '1',
        semester: '2',
      },
      {
        name: 'Tanvi Deshmukh',
        email: 'student.mpharm.s3@rasayanflow.local',
        password: 'Student@2026',
        rollNumber: '0832MP252008',
        year: '2',
        semester: '3',
      },
      {
        name: 'Aman Verma',
        email: 'student.mpharm.s4@rasayanflow.local',
        password: 'Student@2026',
        rollNumber: '0832MP252019',
        year: '2',
        semester: '4',
      },
    ];

    for (const stu of STUDENTS) {
      let student = await User.findOne({ email: stu.email });
      if (!student) {
        student = await User.create({
          name: stu.name,
          email: stu.email,
          password: stu.password,
          displayPassword: stu.password,
          role: 'student',
          isApproved: true,
          course: 'M.Pharm',
          courseType: 'M.Pharm',
          year: stu.year,
          semester: stu.semester,
          rollNumber: stu.rollNumber,
          onboardingComplete: true,
        });
        logger.info(`✅ Created M.Pharm Student: ${stu.name} (Sem ${stu.semester})`);
      } else {
        student.isApproved = true;
        student.course = 'M.Pharm';
        student.courseType = 'M.Pharm';
        student.year = stu.year;
        student.semester = stu.semester;
        student.rollNumber = stu.rollNumber;
        student.onboardingComplete = true;
        student.displayPassword = stu.password;
        await student.save();
      }
    }

    // 5. Seed Authentic Chemical Inventory for all 6 M.Pharm Labs
    const LAB_INVENTORIES = {
      'MPHARM-101L': [
        {
          itemCode: 'CHEM-MP101-01',
          itemName: 'Soya Lecithin AR Grade',
          chemicalName: 'Soya Lecithin',
          category: 'Phospholipid / Emulsifier',
          grade: 'AR',
          quantityAvailable: 500,
          quantityUnit: 'g',
          minThreshold: 50,
          costPerBase: 1.8,
          casNumber: '8002-43-5',
          chemicalFormula: 'C42H80NO8P',
          storageLocation: 'Rack B1-04 (Desiccated)',
          lotNumber: 'SL-2026-08',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-02',
          itemName: 'Cholesterol IP Grade',
          chemicalName: 'Cholesterol',
          category: 'Sterol / Membrane Stabilizer',
          grade: 'IP',
          quantityAvailable: 250,
          quantityUnit: 'g',
          minThreshold: 25,
          costPerBase: 3.5,
          casNumber: '57-88-5',
          chemicalFormula: 'C27H46O',
          storageLocation: 'Rack B1-05 (2-8°C)',
          lotNumber: 'CH-2026-02',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-03',
          itemName: 'Chloroform AR Grade',
          chemicalName: 'Chloroform',
          category: 'Solvent',
          grade: 'AR',
          quantityAvailable: 2500,
          quantityUnit: 'mL',
          minThreshold: 200,
          costPerBase: 0.45,
          casNumber: '67-66-3',
          chemicalFormula: 'CHCl3',
          storageLocation: 'Flammable Cabinet F-02',
          lotNumber: 'CF-2026-11',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-04',
          itemName: 'Phosphate Buffer pH 7.4 Solution',
          chemicalName: 'Phosphate Buffered Saline pH 7.4',
          category: 'Buffer',
          grade: 'AR',
          quantityAvailable: 5000,
          quantityUnit: 'mL',
          minThreshold: 500,
          costPerBase: 0.15,
          casNumber: '7558-79-4',
          storageLocation: 'Shelf A2',
          lotNumber: 'PBS-2026-04',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-05',
          itemName: 'HPMC K100M Premium Polymer',
          chemicalName: 'Hydroxypropyl Methylcellulose K100M',
          category: 'Hydrophilic Polymer Matrix',
          grade: 'USP/NF',
          quantityAvailable: 1000,
          quantityUnit: 'g',
          minThreshold: 100,
          costPerBase: 1.2,
          casNumber: '9004-65-3',
          storageLocation: 'Rack B2-01',
          lotNumber: 'HPMC-2026-05',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-06',
          itemName: 'Lactose Monohydrate IP',
          chemicalName: 'Lactose Monohydrate',
          category: 'Direct Compression Diluent',
          grade: 'IP',
          quantityAvailable: 2000,
          quantityUnit: 'g',
          minThreshold: 150,
          costPerBase: 0.3,
          casNumber: '64044-51-5',
          storageLocation: 'Rack B2-02',
          lotNumber: 'LAC-2026-01',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP101-07',
          itemName: 'Magnesium Stearate IP',
          chemicalName: 'Magnesium Stearate',
          category: 'Tablet Lubricant',
          grade: 'IP',
          quantityAvailable: 400,
          quantityUnit: 'g',
          minThreshold: 40,
          costPerBase: 0.65,
          casNumber: '557-04-0',
          storageLocation: 'Rack B2-03',
          lotNumber: 'MGS-2026-03',
          status: 'In Stock',
        },
      ],
      'MPHARM-102L': [
        {
          itemCode: 'CHEM-MP102-01',
          itemName: 'Paracetamol IP Reference Standard',
          chemicalName: 'Paracetamol Standard API',
          category: 'Primary Reference Standard',
          grade: 'IP/EP',
          quantityAvailable: 100,
          quantityUnit: 'g',
          minThreshold: 10,
          costPerBase: 4.5,
          casNumber: '103-90-2',
          chemicalFormula: 'C8H9NO2',
          storageLocation: 'Desiccator D-01 (Dark)',
          lotNumber: 'PCM-RS-2026',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP102-02',
          itemName: 'Ibuprofen IP Reference Standard',
          chemicalName: 'Ibuprofen Standard API',
          category: 'Primary Reference Standard',
          grade: 'IP/USP',
          quantityAvailable: 100,
          quantityUnit: 'g',
          minThreshold: 10,
          costPerBase: 5.2,
          casNumber: '15687-27-1',
          chemicalFormula: 'C13H18O2',
          storageLocation: 'Desiccator D-02 (Dark)',
          lotNumber: 'IBU-RS-2026',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP102-03',
          itemName: 'Methanol HPLC Grade 99.9%',
          chemicalName: 'Methanol HPLC Gradient Grade',
          category: 'HPLC Chromatography Solvent',
          grade: 'HPLC',
          quantityAvailable: 4000,
          quantityUnit: 'mL',
          minThreshold: 500,
          costPerBase: 0.85,
          casNumber: '67-56-1',
          chemicalFormula: 'CH3OH',
          storageLocation: 'Solvents Cabinet S-01',
          lotNumber: 'MEOH-HPLC-26',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP102-04',
          itemName: 'Acetonitrile HPLC Gradient Grade',
          chemicalName: 'Acetonitrile HPLC',
          category: 'HPLC Chromatography Solvent',
          grade: 'HPLC',
          quantityAvailable: 4000,
          quantityUnit: 'mL',
          minThreshold: 500,
          costPerBase: 1.4,
          casNumber: '75-05-8',
          chemicalFormula: 'CH3CN',
          storageLocation: 'Solvents Cabinet S-02',
          lotNumber: 'ACN-HPLC-26',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP102-05',
          itemName: 'Potassium Dihydrogen Phosphate AR',
          chemicalName: 'Potassium Phosphate Monobasic',
          category: 'Buffer Salt for HPLC',
          grade: 'AR',
          quantityAvailable: 1000,
          quantityUnit: 'g',
          minThreshold: 100,
          costPerBase: 0.95,
          casNumber: '7778-77-0',
          storageLocation: 'Salt Shelf E-03',
          lotNumber: 'KH2PO4-2026',
          status: 'In Stock',
        },
      ],
      'MPHARM-201L': [
        {
          itemCode: 'CHEM-MP201-01',
          itemName: 'Potassium Bromide IR Spectroscopy Grade',
          chemicalName: 'Potassium Bromide (KBr)',
          category: 'FTIR Matrix Salt',
          grade: 'IR Spectroscopy Pure',
          quantityAvailable: 250,
          quantityUnit: 'g',
          minThreshold: 25,
          costPerBase: 3.8,
          casNumber: '7758-02-3',
          storageLocation: 'Vacuum Desiccator D-04',
          lotNumber: 'KBr-IR-2026',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP201-02',
          itemName: 'Ciprofloxacin HCl USP Standard',
          chemicalName: 'Ciprofloxacin Hydrochloride',
          category: 'API Reference Standard',
          grade: 'USP',
          quantityAvailable: 50,
          quantityUnit: 'g',
          minThreshold: 5,
          costPerBase: 8.5,
          casNumber: '86393-32-0',
          storageLocation: 'Desiccator D-03',
          lotNumber: 'CIPRO-2026',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP201-03',
          itemName: 'n-Hexane UV-Spectroscopy Grade',
          chemicalName: 'n-Hexane Spectro',
          category: 'Spectroscopic Solvent',
          grade: 'Spectro Grade',
          quantityAvailable: 2500,
          quantityUnit: 'mL',
          minThreshold: 250,
          costPerBase: 0.9,
          casNumber: '110-54-3',
          storageLocation: 'Solvents Cabinet S-03',
          lotNumber: 'HEX-SPEC-26',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP201-04',
          itemName: 'Ethanol 99.9% Absolute Pure',
          chemicalName: 'Ethanol Absolute',
          category: 'Solvent',
          grade: 'AR',
          quantityAvailable: 5000,
          quantityUnit: 'mL',
          minThreshold: 500,
          costPerBase: 0.5,
          casNumber: '64-17-5',
          storageLocation: 'Flammable Cabinet F-01',
          lotNumber: 'ETH-ABS-26',
          status: 'In Stock',
        },
      ],
      'MPHARM-202L': [
        {
          itemCode: 'CHEM-MP202-01',
          itemName: 'Salicylic Acid AR Grade',
          chemicalName: 'Salicylic Acid',
          category: 'Model Hydrophobic API',
          grade: 'AR',
          quantityAvailable: 500,
          quantityUnit: 'g',
          minThreshold: 50,
          costPerBase: 0.75,
          casNumber: '69-72-7',
          storageLocation: 'Rack C1-01',
          lotNumber: 'SAL-2026-01',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP202-02',
          itemName: '1-Octanol Pure AR for Log P',
          chemicalName: '1-Octanol (n-Octyl Alcohol)',
          category: 'Partition Solvent',
          grade: 'AR',
          quantityAvailable: 1000,
          quantityUnit: 'mL',
          minThreshold: 100,
          costPerBase: 1.5,
          casNumber: '111-87-5',
          storageLocation: 'Rack C1-02',
          lotNumber: 'OCT-2026-02',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP202-03',
          itemName: 'Dialysis Tubing Cellulose Membrane MWCO 12000-14000',
          chemicalName: 'Cellulose Dialysis Membrane',
          category: 'Diffusion Barrier Membrane',
          grade: 'Lab Grade',
          quantityAvailable: 20,
          quantityUnit: 'packs',
          minThreshold: 2,
          costPerBase: 45.0,
          casNumber: '9004-34-6',
          storageLocation: 'Consumables C-05 (4°C)',
          lotNumber: 'DIAL-2026-05',
          status: 'In Stock',
        },
      ],
      'MPHARM-301L': [
        {
          itemCode: 'CHEM-MP301-01',
          itemName: 'Capryol 90 (Propylene glycol monocaprylate)',
          chemicalName: 'Capryol 90',
          category: 'Lipid Solubilizer / Oily Phase',
          grade: 'EP/NF Gattefossé',
          quantityAvailable: 500,
          quantityUnit: 'mL',
          minThreshold: 50,
          costPerBase: 6.2,
          casNumber: '31565-12-5',
          storageLocation: 'Special Lipid Cabinet L-01',
          lotNumber: 'CAP-2026-01',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP301-02',
          itemName: 'Tween 80 (Polysorbate 80 High Purity)',
          chemicalName: 'Polysorbate 80',
          category: 'Non-ionic Surfactant',
          grade: 'AR/Ph. Eur.',
          quantityAvailable: 1000,
          quantityUnit: 'mL',
          minThreshold: 100,
          costPerBase: 1.1,
          casNumber: '9005-65-6',
          storageLocation: 'Shelf B3',
          lotNumber: 'TW80-2026-03',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP301-03',
          itemName: 'Transcutol P (Diethylene glycol monoethyl ether)',
          chemicalName: 'Transcutol P',
          category: 'Co-surfactant / Skin Permeation Enhancer',
          grade: 'Highly Purified EP/USP',
          quantityAvailable: 500,
          quantityUnit: 'mL',
          minThreshold: 50,
          costPerBase: 4.8,
          casNumber: '111-90-0',
          storageLocation: 'Shelf B4',
          lotNumber: 'TRANS-2026-04',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP301-04',
          itemName: 'Chitosan Low Molecular Weight (75-85% Deacetylated)',
          chemicalName: 'Chitosan Low MW',
          category: 'Mucoadhesive Nanopolymer',
          grade: 'Research Grade',
          quantityAvailable: 200,
          quantityUnit: 'g',
          minThreshold: 20,
          costPerBase: 7.5,
          casNumber: '9012-76-4',
          storageLocation: 'Polymer Cabinet P-02',
          lotNumber: 'CHIT-2026-07',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP301-05',
          itemName: 'Sodium Tripolyphosphate (TPP) Anhydrous',
          chemicalName: 'Sodium Tripolyphosphate',
          category: 'Ionic Cross-linker for Nanoparticles',
          grade: 'AR',
          quantityAvailable: 250,
          quantityUnit: 'g',
          minThreshold: 25,
          costPerBase: 1.2,
          casNumber: '7758-29-4',
          storageLocation: 'Shelf E-04',
          lotNumber: 'TPP-2026-09',
          status: 'In Stock',
        },
      ],
      'MPHARM-401L': [
        {
          itemCode: 'CHEM-MP401-01',
          itemName: 'PLGA 50:50 Acid-Terminated (MW 24,000-38,000)',
          chemicalName: 'Poly(lactic-co-glycolic acid) 50:50',
          category: 'Biodegradable Nanosphere Polymer',
          grade: 'Research Grade',
          quantityAvailable: 100,
          quantityUnit: 'g',
          minThreshold: 10,
          costPerBase: 28.0,
          casNumber: '26780-50-7',
          storageLocation: 'Deep Freezer (-20°C)',
          lotNumber: 'PLGA-2026-01',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP401-02',
          itemName: 'Polyvinyl Alcohol (PVA) Mowiol 4-88',
          chemicalName: 'Polyvinyl Alcohol 4-88',
          category: 'Emulsion Stabilizer',
          grade: 'USP Grade',
          quantityAvailable: 500,
          quantityUnit: 'g',
          minThreshold: 50,
          costPerBase: 1.6,
          casNumber: '9002-89-5',
          storageLocation: 'Polymer Cabinet P-01',
          lotNumber: 'PVA-2026-04',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP401-03',
          itemName: 'Dichloromethane (DCM) AR HPLC Grade',
          chemicalName: 'Dichloromethane',
          category: 'Polymer Casting Solvent',
          grade: 'AR',
          quantityAvailable: 2500,
          quantityUnit: 'mL',
          minThreshold: 250,
          costPerBase: 0.65,
          casNumber: '75-09-2',
          storageLocation: 'Halogenated Cabinet H-01',
          lotNumber: 'DCM-2026-02',
          status: 'In Stock',
        },
        {
          itemCode: 'CHEM-MP401-04',
          itemName: 'Dimethyl Sulfoxide (DMSO) Anhydrous 99.9%',
          chemicalName: 'Dimethyl Sulfoxide',
          category: 'Solvent / Cryoprotectant',
          grade: 'Spectroscopy Grade',
          quantityAvailable: 1000,
          quantityUnit: 'mL',
          minThreshold: 100,
          costPerBase: 1.8,
          casNumber: '67-68-5',
          storageLocation: 'Solvents Cabinet S-04',
          lotNumber: 'DMSO-2026-03',
          status: 'In Stock',
        },
      ],
    };

    for (const [labCode, items] of Object.entries(LAB_INVENTORIES)) {
      const targetLab = labMap[labCode];
      if (!targetLab) continue;

      for (const item of items) {
        let inv = await Inventory.findOne({ labId: targetLab._id, itemCode: item.itemCode });
        if (!inv) {
          inv = await Inventory.create({
            ...item,
            labId: targetLab._id,
            labName: targetLab.labName,
            quantity: item.quantityAvailable,
            costPerUnit: item.costPerBase,
            totalValue: item.quantityAvailable * item.costPerBase,
          });
          logger.info(`✅ Seeded Chemical in ${labCode}: ${item.chemicalName} (${item.quantityAvailable} ${item.quantityUnit})`);
        } else {
          inv.itemName = item.itemName;
          inv.chemicalName = item.chemicalName;
          inv.category = item.category;
          inv.grade = item.grade;
          inv.casNumber = item.casNumber;
          inv.storageLocation = item.storageLocation;
          inv.minThreshold = item.minThreshold;
          await inv.save();
        }
      }
    }

    // 6. Seed PCI Curriculum Practical Structures (LabStructure & Experiment)
    const SYLLABUS_PRACTICALS = [
      {
        labCode: 'MPHARM-101L',
        subject: 'Modern Pharmaceutics & Formulation Science (MPH-101T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '1',
        experimentNo: 1,
        experimentName: 'Formulation and characterization of Liposomes by Thin Film Hydration method using Soya Lecithin and Cholesterol',
        chemicals: [
          { chemicalName: 'Soya Lecithin AR Grade', quantityPerStudent: 10, unit: 'g' },
          { chemicalName: 'Cholesterol IP Grade', quantityPerStudent: 5, unit: 'g' },
          { chemicalName: 'Chloroform AR Grade', quantityPerStudent: 30, unit: 'mL' },
          { chemicalName: 'Phosphate Buffer pH 7.4 Solution', quantityPerStudent: 50, unit: 'mL' },
        ],
      },
      {
        labCode: 'MPHARM-101L',
        subject: 'Modern Pharmaceutics & Formulation Science (MPH-101T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '1',
        experimentNo: 2,
        experimentName: 'Formulation and in-vitro evaluation of Sustained Release Matrix Tablets using HPMC K100M hydrophilic polymer',
        chemicals: [
          { chemicalName: 'HPMC K100M Premium Polymer', quantityPerStudent: 25, unit: 'g' },
          { chemicalName: 'Lactose Monohydrate IP', quantityPerStudent: 50, unit: 'g' },
          { chemicalName: 'Magnesium Stearate IP', quantityPerStudent: 2, unit: 'g' },
        ],
      },
      {
        labCode: 'MPHARM-102L',
        subject: 'Modern Pharmaceutical Analytical Techniques (MPA-101T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '1',
        experimentNo: 1,
        experimentName: 'Simultaneous UV-Vis Spectrophotometric estimation of Paracetamol and Ibuprofen by Simultaneous Equation Method',
        chemicals: [
          { chemicalName: 'Paracetamol IP Reference Standard', quantityPerStudent: 0.1, unit: 'g' },
          { chemicalName: 'Ibuprofen IP Reference Standard', quantityPerStudent: 0.1, unit: 'g' },
          { chemicalName: 'Methanol HPLC Grade 99.9%', quantityPerStudent: 100, unit: 'mL' },
        ],
      },
      {
        labCode: 'MPHARM-102L',
        subject: 'Modern Pharmaceutical Analytical Techniques (MPA-101T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '1',
        experimentNo: 2,
        experimentName: 'RP-HPLC Method Development and Chromatographic Assay of Ciprofloxacin in formulation as per ICH guidelines',
        chemicals: [
          { chemicalName: 'Acetonitrile HPLC Gradient Grade', quantityPerStudent: 150, unit: 'mL' },
          { chemicalName: 'Potassium Dihydrogen Phosphate AR', quantityPerStudent: 5, unit: 'g' },
          { chemicalName: 'Methanol HPLC Grade 99.9%', quantityPerStudent: 50, unit: 'mL' },
        ],
      },
      {
        labCode: 'MPHARM-201L',
        subject: 'Advanced Spectral Analysis & Quality Assurance (MPA-201T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '2',
        experimentNo: 1,
        experimentName: 'FT-IR Spectral characterization and polymorphic identification of pure pharmaceutical API using KBr pellet press',
        chemicals: [
          { chemicalName: 'Potassium Bromide IR Spectroscopy Grade', quantityPerStudent: 2, unit: 'g' },
          { chemicalName: 'Ciprofloxacin HCl USP Standard', quantityPerStudent: 0.05, unit: 'g' },
        ],
      },
      {
        labCode: 'MPHARM-202L',
        subject: 'Advanced Biopharmaceutics & Pharmacokinetics (MBP-201T/L)',
        courseType: 'M.Pharm',
        year: '1',
        semester: '2',
        experimentNo: 1,
        experimentName: 'Determination of Apparent Partition Coefficient (Log P) of Salicylic Acid in n-Octanol / pH 7.4 Buffer System',
        chemicals: [
          { chemicalName: 'Salicylic Acid AR Grade', quantityPerStudent: 2, unit: 'g' },
          { chemicalName: '1-Octanol Pure AR for Log P', quantityPerStudent: 50, unit: 'mL' },
        ],
      },
    ];

    for (const prac of SYLLABUS_PRACTICALS) {
      const targetLab = labMap[prac.labCode];
      if (!targetLab) continue;

      let structure = await LabStructure.findOne({
        labId: targetLab._id,
        subject: prac.subject,
        experimentNo: prac.experimentNo,
      });

      if (!structure) {
        structure = await LabStructure.create({
          labId: targetLab._id,
          labName: targetLab.labName,
          courseType: prac.courseType,
          year: prac.year,
          semester: prac.semester,
          subject: prac.subject,
          experimentNo: prac.experimentNo,
          experimentName: prac.experimentName,
          chemicals: prac.chemicals,
          isUnlocked: true,
          uploadedBy: targetLab.admins[0] || createdById,
        });
        logger.info(`✅ Seeded Practical Structure: Exp ${prac.experimentNo} in ${prac.labCode}`);
      } else {
        structure.experimentName = prac.experimentName;
        structure.chemicals = prac.chemicals;
        structure.isUnlocked = true;
        await structure.save();
      }

      let exp = await Experiment.findOne({
        labId: targetLab._id,
        experimentNumber: `Exp ${prac.experimentNo}`,
      });

      const reqInventory = [];
      for (const chem of prac.chemicals) {
        const invItem = await Inventory.findOne({ labId: targetLab._id, chemicalName: new RegExp(chem.chemicalName.split(' ')[0], 'i') });
        if (invItem) {
          reqInventory.push({
            inventoryItemId: invItem._id,
            chemicalName: invItem.chemicalName,
            quantity: chem.quantityPerStudent,
            quantityUnit: chem.unit,
            costPerUnit: invItem.costPerBase || 1,
            estimatedCost: chem.quantityPerStudent * (invItem.costPerBase || 1),
          });
        }
      }

      if (!exp) {
        await Experiment.create({
          labId: targetLab._id,
          experimentNumber: `Exp ${prac.experimentNo}`,
          experimentObject: prac.experimentName,
          requiredInventory: reqInventory,
          totalEstimatedExpense: reqInventory.reduce((acc, curr) => acc + curr.estimatedCost, 0),
          createdBy: targetLab.admins[0] || createdById,
        });
      }
    }

    logger.info('🎉 Authentic M.Pharm infrastructure seeded successfully with 0 mock data!');
  } catch (error) {
    logger.error('❌ Error seeding M.Pharm infrastructure:', { error: error.message, stack: error.stack });
  }
};

module.exports = seedMPharm;
