import { createServer } from 'http';
import app from './app';
import connectDB from './config/db';
import env from './config/env';
import logger from './utils/logger';
import { startOfferTimeoutJob, stopOfferTimeoutJob } from './jobs/offerTimeout.job';
import { initSocket } from './sockets';

process.on('unhandledRejection', (reason: any, promise: any) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message} \nStack: ${error.stack}`);
  process.exit(1);
});

const startServer = async (): Promise<void> => {
  // Step 1: Connect to MongoDB Atlas
  await connectDB();

  // Step 2: Start Background Jobs (60s offer timeout checker)
  startOfferTimeoutJob();

  // Step 3: Create HTTP server & Initialize Socket.io
  const httpServer = createServer(app);
  initSocket(httpServer);

  // Step 4: Listen on configured port
  httpServer.listen(env.port, () => {
    logger.info(`🚀 WasteWallet Server (TS) running on port ${env.port} (http://localhost:${env.port})`);
    logger.info(`🩺 Health check URL: http://localhost:${env.port}/health`);
  });

  const gracefulShutdown = () => {
    logger.info('Received shutdown signal. Closing HTTP server...');
    stopOfferTimeoutJob();
    httpServer.close(() => {
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();
