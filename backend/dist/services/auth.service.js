"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.verifyOtpAndLogin = exports.requestOtp = void 0;
// Authentication Service in TypeScript
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Zone_1 = __importDefault(require("../models/Zone"));
const otp_service_1 = __importDefault(require("./otp.service"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const env_1 = __importDefault(require("../config/env"));
const constants_1 = require("../utils/constants");
const requestOtp = async (phone) => {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        throw new ApiError_1.default(400, 'Please provide a valid 10-digit Indian phone number starting with 6-9');
    }
    return await otp_service_1.default.generateAndSaveOtp(phone);
};
exports.requestOtp = requestOtp;
const verifyOtpAndLogin = async ({ phone, otp, role, name, language, }) => {
    if (!phone || !otp) {
        throw new ApiError_1.default(400, 'Phone number and OTP code are required');
    }
    // 1. Verify OTP
    await otp_service_1.default.verifyOtp(phone, otp);
    // 2. Find or register user
    let user = await User_1.default.findOne({ phone });
    let isNewUser = false;
    if (!user) {
        const userRole = role && Object.values(constants_1.ROLES).includes(role) ? role : 'customer';
        let defaultZoneId = null;
        if (userRole === 'collector') {
            const activeZone = await Zone_1.default.findOne({ isActive: true });
            if (activeZone)
                defaultZoneId = activeZone._id;
        }
        user = await User_1.default.create({
            phone,
            name: name || (userRole === 'collector' ? 'Kaalaankadai Partner' : ''),
            role: userRole,
            language: language || 'en',
            isApproved: true,
            isOnline: true,
            zoneId: defaultZoneId,
        });
        isNewUser = true;
    }
    else if (user.role === 'collector') {
        // If existing collector is missing approval or zone, auto-activate
        let modified = false;
        if (!user.isApproved) {
            user.isApproved = true;
            modified = true;
        }
        if (!user.zoneId) {
            const activeZone = await Zone_1.default.findOne({ isActive: true });
            if (activeZone) {
                user.zoneId = activeZone._id;
                modified = true;
            }
        }
        if (modified) {
            await user.save();
        }
    }
    if (user.isBlocked) {
        throw new ApiError_1.default(403, 'Your account is suspended. Please contact customer support.');
    }
    // 3. Issue JWT Token
    const token = jsonwebtoken_1.default.sign({
        id: user._id.toString(),
        role: user.role,
    }, env_1.default.jwtSecret, { expiresIn: env_1.default.jwtExpiresIn });
    return {
        isNewUser,
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            phone: user.phone,
            role: user.role,
            isApproved: user.isApproved,
            isOnline: user.isOnline,
            rating: user.rating,
            language: user.language,
            address: user.address,
            location: user.location,
        },
    };
};
exports.verifyOtpAndLogin = verifyOtpAndLogin;
const getUserProfile = async (userId) => {
    const user = await User_1.default.findById(userId).select('-__v');
    if (!user) {
        throw new ApiError_1.default(404, 'User not found');
    }
    return user;
};
exports.getUserProfile = getUserProfile;
exports.default = {
    requestOtp: exports.requestOtp,
    verifyOtpAndLogin: exports.verifyOtpAndLogin,
    getUserProfile: exports.getUserProfile,
};
