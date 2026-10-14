"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Auth Routes in TypeScript
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
router.post('/send-otp', auth_controller_1.sendOtp);
router.post('/verify-otp', auth_controller_1.verifyOtp);
router.post('/google', auth_controller_1.googleLogin);
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.post('/forgot-password', auth_controller_1.forgotPassword);
router.post('/reset-password', auth_controller_1.resetPassword);
router.get('/me', auth_1.default, auth_controller_1.getMe);
router.patch('/profile', auth_1.default, auth_controller_1.updateProfile);
router.get('/admin-only', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome Admin! You have access to this protected admin-only resource.',
        data: { user: req.user.name || req.user.phone },
    });
});
exports.default = router;
