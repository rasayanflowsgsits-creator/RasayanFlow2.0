const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    logger.error('MONGO_URI or MONGODB_URI environment variable is missing. Set it in Render settings.');
    return;
  }

  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
  }
};

module.exports = connectDB;
