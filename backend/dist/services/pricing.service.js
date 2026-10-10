"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPickupWithOtp = exports.requestCustomerConfirmationOtp = exports.recordWeighedItems = exports.getEffectiveRate = void 0;
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
    await pickup.save();
    logger_1.default.info(`⚖️ Weighed pickup ${pickup._id}: ${totalWeightKg.toFixed(2)} kg = ₹${(totalAmountPaise / 100).toFixed(2)} (${mode} mode)`);
    return {
        pickup,
        items: createdItems,
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
    await otp_service_1.default.generateAndSaveOtp(customer.phone);
    return {
        phone: customer.phone,
        totalPickupWeightKg: pickup.totalPickupWeightKg,
        totalAmountPaise: pickup.totalAmountPaise,
        totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
    };
};
exports.requestCustomerConfirmationOtp = requestCustomerConfirmationOtp;
/**
 * Step 2 of Confirmation: Customer enters 6-digit OTP to lock weight & amount
 */
const confirmPickupWithOtp = async (pickupId, customerId, otp) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        customerId: new mongoose_1.Types.ObjectId(customerId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found for this customer');
    }
    if (pickup.status !== 'weighed') {
        throw new ApiError_1.default(400, `Cannot confirm pickup with current status: "${pickup.status}". Must be "weighed".`);
    }
    const customer = await User_1.default.findById(customerId);
    if (!customer) {
        throw new ApiError_1.default(404, 'Customer account not found');
    }
    // Verify OTP
    await otp_service_1.default.verifyOtp(customer.phone, otp);
    // Lock the pickup amount permanently
    pickup.status = 'confirmed';
    pickup.customerConfirmed = true;
    pickup.otpVerifiedAt = new Date();
    await pickup.save();
    logger_1.default.info(`🔒 Customer confirmed pickup ${pickup._id} with OTP! Amount locked at ₹${(pickup.totalAmountPaise / 100).toFixed(2)}`);
    return pickup;
};
exports.confirmPickupWithOtp = confirmPickupWithOtp;
exports.default = {
    getEffectiveRate: exports.getEffectiveRate,
    recordWeighedItems: exports.recordWeighedItems,
    requestCustomerConfirmationOtp: exports.requestCustomerConfirmationOtp,
    confirmPickupWithOtp: exports.confirmPickupWithOtp,
};
