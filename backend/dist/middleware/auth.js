"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const env_1 = __importDefault(require("../config/env"));
exports.authenticate = (0, asyncHandler_1.default)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        throw new ApiError_1.default(401, 'Authentication token missing. Please sign in.');
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, env_1.default.jwtSecret);
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new ApiError_1.default(401, 'Session expired. Please sign in again.');
        }
        throw new ApiError_1.default(401, 'Invalid authentication token.');
    }
    const currentUser = await User_1.default.findById(decoded.id);
    if (!currentUser) {
        throw new ApiError_1.default(401, 'The account belonging to this token no longer exists.');
    }
    if (currentUser.isBlocked) {
        throw new ApiError_1.default(403, 'Your account has been suspended. Please contact support.');
    }
    req.user = currentUser;
    next();
});
exports.default = exports.authenticate;
