"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const env_1 = __importDefault(require("../config/env"));
const notFound = (req, res, next) => {
    next(new ApiError_1.default(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
exports.notFound = notFound;
const errorHandler = (err, req, res, next // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (statusCode >= 500) {
        logger_1.default.error(`[Server Error] ${err.message} \nStack: ${err.stack}`);
    }
    else {
        logger_1.default.warn(`[Client Error] ${statusCode} - ${err.message}`);
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(env_1.default.nodeEnv !== 'production' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
exports.default = {
    notFound: exports.notFound,
    errorHandler: exports.errorHandler,
};
