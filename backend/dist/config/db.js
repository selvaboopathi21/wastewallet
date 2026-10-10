"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
// MongoDB connection module in TypeScript
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(env_1.env.mongoUri, {
            autoIndex: true,
        });
        logger_1.logger.info(`✅ MongoDB Connected successfully to host: ${conn.connection.host}`);
    }
    catch (error) {
        logger_1.logger.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
mongoose_1.default.connection.on('disconnected', () => {
    logger_1.logger.warn('⚠️ MongoDB disconnected.');
});
mongoose_1.default.connection.on('error', (err) => {
    logger_1.logger.error(`❌ MongoDB event error: ${err.message}`);
});
exports.default = exports.connectDB;
