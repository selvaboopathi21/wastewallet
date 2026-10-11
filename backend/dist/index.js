"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const env_1 = __importDefault(require("./config/env"));
const logger_1 = __importDefault(require("./utils/logger"));
const offerTimeout_job_1 = require("./jobs/offerTimeout.job");
const sockets_1 = require("./sockets");
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
    // Step 2: Start Background Jobs (60s offer timeout checker)
    (0, offerTimeout_job_1.startOfferTimeoutJob)();
    // Step 3: Create HTTP server & Initialize Socket.io
    const httpServer = (0, http_1.createServer)(app_1.default);
    (0, sockets_1.initSocket)(httpServer);
    // Step 4: Listen on configured port
    httpServer.listen(env_1.default.port, () => {
        logger_1.default.info(`🚀 WasteWallet Server (TS) running on port ${env_1.default.port} (http://localhost:${env_1.default.port})`);
        logger_1.default.info(`🩺 Health check URL: http://localhost:${env_1.default.port}/health`);
    });
    const gracefulShutdown = () => {
        logger_1.default.info('Received shutdown signal. Closing HTTP server...');
        (0, offerTimeout_job_1.stopOfferTimeoutJob)();
        httpServer.close(() => {
            logger_1.default.info('HTTP server closed. Exiting process.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
};
startServer();
