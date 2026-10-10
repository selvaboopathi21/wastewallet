"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Server entry point in TypeScript
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const env_1 = __importDefault(require("./config/env"));
const logger_1 = __importDefault(require("./utils/logger"));
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
process.on('uncaughtException', (error) => {
    logger_1.default.error(`Uncaught Exception: ${error.message} \nStack: ${error.stack}`);
    process.exit(1);
});
const startServer = async () => {
    // Step 1: Connect to MongoDB Atlas
    await (0, db_1.default)();
    // Step 2: Start Express HTTP Server
    const server = app_1.default.listen(env_1.default.port, () => {
        logger_1.default.info(`🚀 WasteWallet Server (TS) running on port ${env_1.default.port} (http://localhost:${env_1.default.port})`);
        logger_1.default.info(`🩺 Health check URL: http://localhost:${env_1.default.port}/health`);
    });
    const gracefulShutdown = () => {
        logger_1.default.info('Received shutdown signal. Closing HTTP server...');
        server.close(() => {
            logger_1.default.info('HTTP server closed. Exiting process.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
};
startServer();
