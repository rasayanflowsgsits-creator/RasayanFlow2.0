const mongoose = require('mongoose');
const logger = require('../utils/logger');

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      logger.info('MongoDB connected successfully');
      return;
    } catch (err) {
      logger.warn(`Could not connect to external/local MongoDB: ${err.message}`);
    }
  }

  // Graceful fallback to in-memory MongoDB for local development
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    logger.info('Starting local development MongoDB in-memory server...');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    logger.info(`Local in-memory MongoDB connected successfully at ${memUri}`);
  } catch (memErr) {
    logger.error('Failed to start in-memory MongoDB server:', memErr.message);
  }
};

module.exports = connectDB;

