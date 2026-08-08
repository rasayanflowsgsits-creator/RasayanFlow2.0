const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const existingUser = await User.findOne({ email: 'storemanagersgsits@gmail.com' });
  if (existingUser) {
    console.log('User already exists');
    process.exit(0);
  }

  // Insert exactly matching user's request
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("store@1234", salt);

  const result = await mongoose.connection.collection('users').insertOne({
    name: "Store Manager",
    email: "storemanagersgsits@gmail.com",
    password: hashedPassword,
    role: "store_admin",
    isApproved: true,
    isActive: true,
    isBlocked: false,
    blockedReason: "",
    blockedBy: null,
    createdAt: new Date(),
    __v: 0
  });

  console.log('Inserted user:', result.insertedId);
  process.exit(0);
})
.catch((err) => {
  console.error(err);
  process.exit(1);
});
