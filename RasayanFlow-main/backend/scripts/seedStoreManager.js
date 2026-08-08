const User = require('../models/User');

const seedStoreManager = async () => {
  try {
    const email = 'storemanagersgsits@gmail.com';
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: 'Store Manager',
        email: email,
        password: 'store@1234',
        role: 'store_admin',
        isApproved: true,
      });
      console.log(`✅ Created new store manager: ${email}`);
    } else if (user.role !== 'store_admin') {
      user.role = 'store_admin';
      user.isApproved = true;
      await user.save();
      console.log(`✅ Updated existing store manager: ${email}`);
    } else {
      console.log(`✅ Store manager already exists: ${email}`);
    }
  } catch (error) {
    console.error('❌ Error seeding storeManager:', error.message);
  }
};

module.exports = seedStoreManager;
