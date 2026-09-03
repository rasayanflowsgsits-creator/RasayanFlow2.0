const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    logger.warn('MONGO_URI is missing. Spinning up mongodb-memory-server for local testing...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      logger.info(`In-memory MongoDB started at ${uri}`);
    } catch (memErr) {
      logger.error('Failed to start mongodb-memory-server:', memErr.message);
      return;
    }
  }

  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
  }
};

module.exports = connectDB;
