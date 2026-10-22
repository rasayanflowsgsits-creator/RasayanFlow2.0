const mongoose = require('mongoose');
const User = require('../models/User');

const seedStoreManager = async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    const storeAccounts = [
      { email: 'storemanagersgsits@gmail.com', password: 'store@1234', name: 'Central Store Manager' },
      { email: 'store@pharm.edu', password: 'Password@2026', name: 'Store Admin' }
    ];

    for (const acc of storeAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = await User.create({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: 'store_admin',
          isApproved: true,
        });
        console.log(`✅ Created store manager: ${acc.email}`);
      } else if (user.role !== 'store_admin') {
        user.role = 'store_admin';
        user.isApproved = true;
        await user.save();
        console.log(`✅ Updated store manager role: ${acc.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding storeManager:', error.message);
  }
};

module.exports = seedStoreManager;
