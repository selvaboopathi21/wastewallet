"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
// Custom ApiError with HTTP status code support
class ApiError extends Error {
    statusCode;
    isOperational;
    constructor(statusCode, message, isOperational = true, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (stack) {
            this.stack = stack;
        }
        else if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.ApiError = ApiError;
exports.default = ApiError;
