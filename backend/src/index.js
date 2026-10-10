// Server entry point: connects DB, then starts listening
const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const logger = require('./utils/logger');

// Catch any unhandled promise errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message} \nStack: ${error.stack}`);
  process.exit(1);
});

// Bootstrapping function
const startServer = async () => {
  // Step 1: Connect to MongoDB Atlas
  await connectDB();

  // Step 2: Start Express HTTP server
  const server = app.listen(port, () => {
    logger.info(`🚀 WasteWallet Server running on port ${port} (http://localhost:${port})`);
    logger.info(`🩺 Health check URL: http://localhost:${port}/health`);
  });

  // Graceful shutdown on SIGTERM / SIGINT
  const gracefulShutdown = () => {
    logger.info('Received shutdown signal. Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();
