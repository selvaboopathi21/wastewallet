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
    // Real-Time Socket.io: Notify customer and collector of payment
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitStatusChanged(pickup._id.toString(), {
            pickupId: pickup._id,
            requestId: pickup._id,
            newStatus: 'paid',
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
    }
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
    // Real-Time Socket.io: Notify customer and collector of completion
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitStatusChanged(pickup._id.toString(), {
            pickupId: pickup._id,
            requestId: pickup._id,
            newStatus: 'completed',
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
    }
    return pickup;
};
exports.completePickup = completePickup;
exports.default = {
    processCashPayment: exports.processCashPayment,
    completePickup: exports.completePickup,
};
