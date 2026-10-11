"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.verifyOtp = exports.sendOtp = void 0;
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
    const { phone, otp, role, name, language } = req.body;
    const result = await auth_service_1.default.verifyOtpAndLogin({
        phone,
        otp,
        role,
        name,
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
exports.default = {
    sendOtp: exports.sendOtp,
    verifyOtp: exports.verifyOtp,
    getMe: exports.getMe,
};
