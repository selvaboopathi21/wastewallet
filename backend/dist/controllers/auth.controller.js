"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = exports.updateProfile = exports.getMe = exports.googleLogin = exports.verifyOtp = exports.sendOtp = void 0;
const auth_service_1 = __importDefault(require("../services/auth.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
// POST /api/v1/auth/send-otp
exports.sendOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const { phone } = req.body;
    const result = await auth_service_1.default.requestOtp(phone);
    res.status(200).json({
        success: true,
        message: result.otp
            ? `OTP generated! [Demo OTP: ${result.otp}]`
            : 'OTP sent successfully to your phone number',
        data: {
            phone: result.phone,
            expiresAt: result.expiresAt,
            otp: result.otp,
        },
    });
});
// POST /api/v1/auth/verify-otp
exports.verifyOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const { phone, otp, role, name, email, address, language } = req.body;
    const result = await auth_service_1.default.verifyOtpAndLogin({
        phone,
        otp,
        role,
        name,
        email,
        address,
        language,
    });
    res.status(200).json({
        success: true,
        message: result.isNewUser ? 'User registered and signed in successfully' : 'Signed in successfully',
        data: {
            token: result.token,
            user: result.user,
        },
    });
});
// POST /api/v1/auth/google
exports.googleLogin = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, phone, name, googleId, role, address } = req.body;
    const result = await auth_service_1.default.googleAuthLogin({
        email,
        phone,
        name,
        googleId,
        role,
        address,
    });
    res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Account registered with Google successfully' : 'Signed in with Google successfully',
        data: {
            token: result.token,
            user: result.user,
        },
    });
});
// GET /api/v1/auth/me (Protected route)
exports.getMe = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await auth_service_1.default.getUserProfile(req.user._id.toString());
    res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
            user,
        },
    });
});
// PATCH /api/v1/auth/profile (Update name, address, language)
exports.updateProfile = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, address, language } = req.body;
    const user = await auth_service_1.default.updateUserProfile(req.user._id.toString(), {
        name,
        address,
        language,
    });
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user,
        },
    });
});
// POST /api/v1/auth/register
exports.register = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, phone, password, role, address } = req.body;
    const result = await auth_service_1.default.registerWithPassword({
        name,
        email,
        phone,
        password,
        role,
        address,
    });
    res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
            token: result.token,
            user: result.user,
        },
    });
});
// POST /api/v1/auth/login
exports.login = (0, asyncHandler_1.default)(async (req, res) => {
    const { identifier, password } = req.body;
    const result = await auth_service_1.default.loginWithPassword({
        identifier,
        password,
    });
    res.status(200).json({
        success: true,
        message: 'Signed in successfully',
        data: {
            token: result.token,
            user: result.user,
        },
    });
});
exports.default = {
    sendOtp: exports.sendOtp,
    verifyOtp: exports.verifyOtp,
    googleLogin: exports.googleLogin,
    register: exports.register,
    login: exports.login,
    getMe: exports.getMe,
    updateProfile: exports.updateProfile,
};
