"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// Express App setup in TypeScript
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = __importDefault(require("./config/env"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
exports.app = (0, express_1.default)();
// 1. Security Headers
exports.app.use((0, helmet_1.default)());
// 2. CORS configuration
const allowedOrigins = [env_1.default.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
}));
// 3. Body parsers
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
// 4. Health Check Routes
exports.app.get('/health', (req, res) => {
    const dbStatus = mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
        success: true,
        message: 'WasteWallet API is healthy and running (TypeScript)',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: dbStatus,
        },
    });
});
exports.app.get('/api/v1/health', (req, res) => {
    const dbStatus = mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
        success: true,
        message: 'WasteWallet API v1 is healthy and running (TypeScript)',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: dbStatus,
        },
    });
});
// 5. API v1 Router
exports.app.use('/api/v1', routes_1.default);
// 6. 404 Handler
exports.app.use(errorHandler_1.notFound);
// 7. Global Central Error Handler
exports.app.use(errorHandler_1.errorHandler);
exports.default = exports.app;
