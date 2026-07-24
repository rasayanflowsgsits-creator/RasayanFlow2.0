const mongoose = require('mongoose');
const Lab = require('./models/Lab');

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/pharmlab');
        console.log('Connected to DB');
        
        // Find existing lab or create a new one
        const lab = new Lab({
            labName: 'Test Lab',
            labCode: 'TEST101',
            courseType: 'B.Pharm',
            department: 'Pharmacy',
            year: '1',
            semester: '2',
            createdBy: new mongoose.Types.ObjectId()
        });
        
        await lab.save();
        console.log('Lab created successfully with new fields:', lab);
        
        await Lab.deleteOne({ _id: lab._id });
        console.log('Lab deleted');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
