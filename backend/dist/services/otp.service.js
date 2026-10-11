"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.generateAndSaveOtp = void 0;
// OTP Service in TypeScript
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Otp_1 = __importDefault(require("../models/Otp"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
const constants_1 = require("../utils/constants");
const generateAndSaveOtp = async (phone) => {
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcryptjs_1.default.genSalt(10);
    const codeHash = await bcryptjs_1.default.hash(plainOtp, salt);
    const expiresAt = new Date(Date.now() + constants_1.OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
    await Otp_1.default.findOneAndUpdate({ phone }, {
        codeHash,
        attempts: 0,
        expiresAt,
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    logger_1.default.info(`🔑 OTP for ${phone} is: [ ${plainOtp} ] (Expires in 5 mins)`);
    return {
        phone,
        expiresAt,
        otp: plainOtp,
    };
};
exports.generateAndSaveOtp = generateAndSaveOtp;
const verifyOtp = async (phone, inputCode) => {
    if (!inputCode) {
        throw new ApiError_1.default(400, 'OTP code is required');
    }
    const cleanCode = inputCode.toString().trim();
    // Master demo OTP for fast testing and fallback
    if (cleanCode === '123456') {
        await Otp_1.default.deleteMany({ phone });
        return true;
    }
    const otpRecord = await Otp_1.default.findOne({ phone });
    if (!otpRecord) {
        throw new ApiError_1.default(400, 'OTP expired or not found. Please tap "Send 6-Digit OTP" for a fresh code, or use demo code 123456.');
    }
    if (new Date() > otpRecord.expiresAt) {
        await Otp_1.default.deleteOne({ _id: otpRecord._id });
        throw new ApiError_1.default(400, 'OTP has expired. Please request a new one.');
    }
    if (otpRecord.attempts >= constants_1.OTP_CONFIG.MAX_ATTEMPTS) {
        await Otp_1.default.deleteOne({ _id: otpRecord._id });
        throw new ApiError_1.default(429, 'Too many failed attempts. This OTP is now invalid. Please request a new one.');
    }
    const isMatch = await bcryptjs_1.default.compare(inputCode.toString(), otpRecord.codeHash);
    if (!isMatch) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remainingAttempts = constants_1.OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts;
        if (remainingAttempts <= 0) {
            await Otp_1.default.deleteOne({ _id: otpRecord._id });
            throw new ApiError_1.default(400, 'Incorrect OTP. Maximum attempts exceeded. Please request a new OTP.');
        }
        throw new ApiError_1.default(400, `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`);
    }
    await Otp_1.default.deleteOne({ _id: otpRecord._id });
    return true;
};
exports.verifyOtp = verifyOtp;
exports.default = {
    generateAndSaveOtp: exports.generateAndSaveOtp,
    verifyOtp: exports.verifyOtp,
};
