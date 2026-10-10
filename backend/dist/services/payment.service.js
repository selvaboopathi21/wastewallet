"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completePickup = exports.processCashPayment = void 0;
// Payment Service: Handles cash settlement, idempotent records, and completes pickups
const mongoose_1 = require("mongoose");
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const Payment_1 = __importDefault(require("../models/Payment"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Collector records on-site cash payment after customer has OTP-confirmed
 */
const processCashPayment = async (pickupId, collectorId) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to you');
    }
    if (pickup.status !== 'confirmed') {
        throw new ApiError_1.default(400, `Cannot record payment while status is "${pickup.status}". Customer must confirm with OTP first.`);
    }
    // Idempotency: Check if payment record already exists
    let payment = await Payment_1.default.findOne({ requestId: pickup._id });
    if (payment) {
        logger_1.default.warn(`Payment record already exists for pickup ${pickupId}. Returning existing payment.`);
    }
    else {
        // Create new payment record
        payment = await Payment_1.default.create({
            requestId: pickup._id,
            method: 'cash',
            amountPaise: pickup.totalAmountPaise,
            status: 'completed',
            idempotencyKey: `cash_${pickup._id}`,
            paidAt: new Date(),
        });
    }
    // Update status: confirmed ➔ paid
    pickup.status = 'paid';
    await pickup.save();
    logger_1.default.info(`💵 Cash payment of ₹${(pickup.totalAmountPaise / 100).toFixed(2)} recorded for pickup ${pickup._id}`);
    return {
        pickup,
        payment,
    };
};
exports.processCashPayment = processCashPayment;
/**
 * Collector finalizes pickup: paid ➔ completed
 */
const completePickup = async (pickupId, collectorId) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to you');
    }
    if (pickup.status !== 'paid') {
        throw new ApiError_1.default(400, `Cannot complete pickup. Current status must be "paid", but is "${pickup.status}".`);
    }
    // Update status: paid ➔ completed
    pickup.status = 'completed';
    await pickup.save();
    logger_1.default.info(`🏁 Pickup ${pickup._id} successfully completed!`);
    return pickup;
};
exports.completePickup = completePickup;
exports.default = {
    processCashPayment: exports.processCashPayment,
    completePickup: exports.completePickup,
};
