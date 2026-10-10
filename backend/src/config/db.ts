// MongoDB connection module in TypeScript
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: true,
    });

    logger.info(`✅ MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('error', (err: Error) => {
  logger.error(`❌ MongoDB event error: ${err.message}`);
});

export default connectDB;
