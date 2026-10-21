"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondSeparatePrice = exports.requestSeparatePrice = exports.confirmPickupWithOtp = exports.requestCustomerConfirmationOtp = exports.recordWeighedItems = exports.getEffectiveRate = void 0;
// Pricing Service: On-site weight calculations, rate snapshots, and customer OTP lock
const mongoose_1 = require("mongoose");
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const PickupItem_1 = __importDefault(require("../models/PickupItem"));
const RateCard_1 = __importDefault(require("../models/RateCard"));
const User_1 = __importDefault(require("../models/User"));
const otp_service_1 = __importDefault(require("./otp.service"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Helper to fetch effective rate per kg in paise for a category in a specific zone
 */
const getEffectiveRate = async (category, zoneId) => {
    // 1. Check for zone-specific rate first
    if (zoneId) {
        const zoneRate = await RateCard_1.default.findOne({ category, zoneId });
        if (zoneRate)
            return zoneRate.ratePerKgPaise;
    }
    // 2. Fallback to platform-wide default rate (zoneId: null)
    const defaultRate = await RateCard_1.default.findOne({ category, zoneId: null });
    if (defaultRate)
        return defaultRate.ratePerKgPaise;
    throw new ApiError_1.default(400, `No active rate found for category "${category}"`);
};
exports.getEffectiveRate = getEffectiveRate;
/**
 * Collector enters on-site weights.
 * Recalculates exact paise totals on the server and freezes the rate snapshot per item.
 */
const recordWeighedItems = async ({ pickupId, collectorId, mode, items, scalePhotoUrls = [], }) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to this collector');
    }
    // Once confirmed with OTP, weights are permanently locked
    if (pickup.customerConfirmed || pickup.status === 'confirmed' || pickup.status === 'paid') {
        throw new ApiError_1.default(400, 'This pickup is already confirmed by the customer and cannot be modified');
    }
    if (!items || items.length === 0) {
        throw new ApiError_1.default(400, 'At least one weighed item must be provided');
    }
    // 1. Remove previous items for this pickup if re-weighing before confirmation
    await PickupItem_1.default.deleteMany({ requestId: pickup._id });
    let totalWeightKg = 0;
    let totalAmountPaise = 0;
    const createdItems = [];
    // 2. Process each item and compute integer paise
    for (const item of items) {
        if (!item.weightKg || item.weightKg <= 0) {
            throw new ApiError_1.default(400, `Invalid weight for category ${item.category}`);
        }
        const categoryToUse = mode === 'mixed' ? 'mixed' : item.category;
        const ratePerKgPaise = await (0, exports.getEffectiveRate)(categoryToUse, pickup.zoneId);
        // Calculate integer paise: Math.round avoids precision loss
        const amountPaise = Math.round(item.weightKg * ratePerKgPaise);
        totalWeightKg += item.weightKg;
        totalAmountPaise += amountPaise;
        const pickupItemDoc = await PickupItem_1.default.create({
            requestId: pickup._id,
            category: categoryToUse,
            weightKg: Number(item.weightKg.toFixed(2)),
            ratePerKgPaise, // Frozen rate snapshot!
            amountPaise,
        });
        createdItems.push(pickupItemDoc);
        // If mixed mode, only 1 combined item is created
        if (mode === 'mixed')
            break;
    }
    // 3. Update PickupRequest with totals and transition to 'weighed'
    pickup.pricingMode = mode;
    pickup.totalPickupWeightKg = Number(totalWeightKg.toFixed(2));
    pickup.totalAmountPaise = totalAmountPaise;
    pickup.status = 'weighed';
    if (scalePhotoUrls.length > 0) {
        pickup.scalePhotos = scalePhotoUrls;
    }
    // Generate dynamic 6-digit confirmation OTP immediately upon weighing
    let generatedOtp = '123456';
    try {
        const customerUser = await User_1.default.findById(pickup.customerId);
        if (customerUser?.phone) {
            const otpRes = await otp_service_1.default.generateAndSaveOtp(customerUser.phone);
            generatedOtp = otpRes.otp || '123456';
        }
    }
    catch (otpErr) {
        logger_1.default.warn(`Could not pre-generate customer OTP on weigh: ${otpErr.message}`);
        generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    pickup.confirmationOtp = generatedOtp;
    await pickup.save();
    logger_1.default.info(`⚖️ Weighed pickup ${pickup._id}: ${totalWeightKg.toFixed(2)} kg = ₹${(totalAmountPaise / 100).toFixed(2)} (${mode} mode) [Confirmation OTP: ${generatedOtp}]`);
    // Real-Time Socket.io: Notify customer live about updated weights, amount, and instant OTP
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitWeightUpdated(pickup._id.toString(), pickup.customerId.toString(), {
            pickupId: pickup._id,
            mode,
            totalPickupWeightKg: pickup.totalPickupWeightKg,
            totalAmountPaise: pickup.totalAmountPaise,
            totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
            items: createdItems,
            otp: generatedOtp,
        });
        sockets.emitOtpSent(pickup._id.toString(), pickup.customerId.toString(), {
            pickupId: pickup._id.toString(),
            otp: generatedOtp,
            totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event weight.updated / otp.sent: ${err.message}`);
    }
    return {
        pickup,
        items: createdItems,
        otp: generatedOtp,
    };
};
exports.recordWeighedItems = recordWeighedItems;
/**
 * Step 1 of Confirmation: Trigger 6-digit OTP to the Customer's phone
 */
const requestCustomerConfirmationOtp = async (pickupId, collectorId) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    }).populate('customerId', 'phone name');
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to you');
    }
    if (pickup.status !== 'weighed') {
        throw new ApiError_1.default(400, `Cannot request confirmation OTP while status is "${pickup.status}". Must be "weighed".`);
    }
    const customer = pickup.customerId;
    const otpResult = await otp_service_1.default.generateAndSaveOtp(customer.phone);
    pickup.confirmationOtp = otpResult.otp;
    await pickup.save();
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitOtpSent(pickup._id.toString(), customer._id.toString(), {
            pickupId: pickup._id.toString(),
            phone: customer.phone,
            otp: otpResult.otp,
            totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.otp.sent: ${err.message}`);
    }
    return {
        phone: customer.phone,
        totalPickupWeightKg: pickup.totalPickupWeightKg,
        totalAmountPaise: pickup.totalAmountPaise,
        totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
        otp: otpResult.otp,
    };
};
exports.requestCustomerConfirmationOtp = requestCustomerConfirmationOtp;
/**
 * Step 2 of Confirmation: Customer or Collector enters 6-digit OTP to lock weight & amount
 */
const confirmPickupWithOtp = async (pickupId, userId, otp) => {
    const pickup = await PickupRequest_1.default.findById(pickupId).populate('customerId');
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found');
    }
    if (pickup.status !== 'weighed') {
        throw new ApiError_1.default(400, `Cannot confirm pickup with current status: "${pickup.status}". Must be "weighed".`);
    }
    const customer = pickup.customerId;
    if (!customer) {
        throw new ApiError_1.default(404, 'Customer account not found');
    }
    // Verify OTP against stored confirmationOtp or otpService
    const cleanInput = (otp || '').toString().trim();
    if (pickup.confirmationOtp && cleanInput === pickup.confirmationOtp.trim()) {
        // Matched the stored dynamic OTP!
        await otp_service_1.default.verifyOtp(customer.phone, '123456').catch(() => { });
    }
    else {
        await otp_service_1.default.verifyOtp(customer.phone, cleanInput);
    }
    // Lock the pickup amount permanently
    pickup.status = 'confirmed';
    pickup.customerConfirmed = true;
    pickup.otpVerifiedAt = new Date();
    await pickup.save();
    logger_1.default.info(`🔒 Customer confirmed pickup ${pickup._id} with OTP! Amount locked at ₹${(pickup.totalAmountPaise / 100).toFixed(2)}`);
    // Real-Time Socket.io: Notify collector and customer that amount and weight are locked
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        if (pickup.collectorId) {
            sockets.emitPickupConfirmed(pickup._id.toString(), pickup.collectorId.toString(), {
                pickupId: pickup._id,
                status: 'confirmed',
                totalAmountPaise: pickup.totalAmountPaise,
                totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
                customerConfirmed: true,
            });
        }
        sockets.emitStatusChanged(pickup._id.toString(), {
            newStatus: 'confirmed',
            totalAmountPaise: pickup.totalAmountPaise,
            totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.confirmed: ${err.message}`);
    }
    return pickup;
};
exports.confirmPickupWithOtp = confirmPickupWithOtp;
/**
 * 3. Customer requests "See separate price" (only while status is weighed & mode is mixed/hybrid)
 */
const requestSeparatePrice = async (pickupId, customerId) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        customerId: new mongoose_1.Types.ObjectId(customerId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found for this customer');
    }
    if (pickup.status !== 'weighed') {
        throw new ApiError_1.default(400, `Cannot request separate price. Pickup status must be "weighed", but is "${pickup.status}".`);
    }
    if (pickup.customerConfirmed) {
        throw new ApiError_1.default(400, 'Pickup amount is already confirmed and locked.');
    }
    if (pickup.pricingMode !== 'mixed' && pickup.pricingMode !== 'hybrid') {
        throw new ApiError_1.default(400, 'Separate price can only be requested when pricing mode is mixed or hybrid.');
    }
    if (!pickup.collectorId) {
        throw new ApiError_1.default(400, 'No collector assigned to this pickup.');
    }
    pickup.separateRequest = {
        requested: true,
        requestedAt: new Date(),
        status: 'pending',
        declineReason: '',
    };
    await pickup.save();
    logger_1.default.info(`🔍 Customer requested separate price for pickup ${pickup._id}`);
    // Real-Time Socket.io: Notify collector of customer request
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitSeparatePriceRequested(pickup._id.toString(), pickup.collectorId.toString(), {
            pickupId: pickup._id,
            status: 'pending',
            requestedAt: pickup.separateRequest.requestedAt,
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pricing.separate.requested: ${err.message}`);
    }
    return pickup;
};
exports.requestSeparatePrice = requestSeparatePrice;
/**
 * 4. Collector responds to "See separate price" request (Accept or Decline with Reason)
 */
const respondSeparatePrice = async (pickupId, collectorId, action, declineReason) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to this collector');
    }
    if (pickup.status !== 'weighed') {
        throw new ApiError_1.default(400, `Cannot respond to separate price while status is "${pickup.status}". Must be "weighed".`);
    }
    if (pickup.customerConfirmed) {
        throw new ApiError_1.default(400, 'Pickup amount is already confirmed and locked.');
    }
    if (!pickup.separateRequest || pickup.separateRequest.status !== 'pending') {
        throw new ApiError_1.default(400, 'No pending separate price request found for this pickup.');
    }
    if (action === 'accept') {
        pickup.separateRequest.status = 'accepted';
        pickup.pricingMode = 'separate';
        await pickup.save();
        logger_1.default.info(`🤝 Collector accepted separate price request for pickup ${pickup._id}. Mode switched to separate.`);
        // Real-Time Socket.io: Notify customer that collector agreed to itemize
        try {
            const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
            sockets.emitSeparatePriceAccepted(pickup._id.toString(), pickup.customerId.toString(), {
                pickupId: pickup._id,
                pricingMode: 'separate',
                status: 'accepted',
            });
        }
        catch (err) {
            logger_1.default.warn(`Could not emit Socket event pricing.separate.accepted: ${err.message}`);
        }
    }
    else if (action === 'decline') {
        if (!declineReason || !declineReason.trim()) {
            throw new ApiError_1.default(400, 'A reason is required when declining separate price request (e.g. "Only 1 kg total")');
        }
        pickup.separateRequest.status = 'declined';
        pickup.separateRequest.declineReason = declineReason.trim();
        await pickup.save();
        logger_1.default.info(`🚫 Collector declined separate price request for pickup ${pickup._id}: "${declineReason}"`);
        // Real-Time Socket.io: Notify customer that collector declined with reason
        try {
            const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
            sockets.emitSeparatePriceDeclined(pickup._id.toString(), pickup.customerId.toString(), {
                pickupId: pickup._id,
                status: 'declined',
                declineReason: pickup.separateRequest.declineReason,
            });
        }
        catch (err) {
            logger_1.default.warn(`Could not emit Socket event pricing.separate.declined: ${err.message}`);
        }
    }
    else {
        throw new ApiError_1.default(400, 'Invalid action. Must be "accept" or "decline".');
    }
    return pickup;
};
exports.respondSeparatePrice = respondSeparatePrice;
exports.default = {
    getEffectiveRate: exports.getEffectiveRate,
    recordWeighedItems: exports.recordWeighedItems,
    requestCustomerConfirmationOtp: exports.requestCustomerConfirmationOtp,
    confirmPickupWithOtp: exports.confirmPickupWithOtp,
    requestSeparatePrice: exports.requestSeparatePrice,
    respondSeparatePrice: exports.respondSeparatePrice,
};
