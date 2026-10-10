// Database connection to MongoDB Atlas using Mongoose
const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true, // Build indexes automatically in development
    });

    logger.info(`✅ MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    // Exit process with failure code if DB cannot connect
    process.exit(1);
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`❌ MongoDB event error: ${err.message}`);
});

module.exports = connectDB;
