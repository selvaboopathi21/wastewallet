"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopOfferTimeoutJob = exports.startOfferTimeoutJob = exports.checkExpiredOffers = void 0;
// Offer Timeout Background Job: Checks MongoDB for expired 60-second offers every 10 seconds
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const dispatch_service_1 = __importDefault(require("../services/dispatch.service"));
const logger_1 = __importDefault(require("../utils/logger"));
let intervalId = null;
const checkExpiredOffers = async () => {
    try {
        const now = new Date();
        // Query MongoDB directly for any offers where the timer has run out
        const expiredOffers = await PickupRequest_1.default.find({
            status: 'offered',
            offerExpiresAt: { $lte: now },
        });
        if (expiredOffers.length > 0) {
            logger_1.default.info(`⏱️ Found ${expiredOffers.length} timed-out offer(s). Re-routing or extending pool...`);
            for (const pickup of expiredOffers) {
                const pickupAgeMs = now.getTime() - new Date(pickup.createdAt).getTime();
                // If pickup request is older than 2 hours, permanently expire it
                if (pickupAgeMs > 2 * 60 * 60 * 1000) {
                    pickup.status = 'expired';
                    pickup.currentOfferCollectorId = null;
                    pickup.offerExpiresAt = null;
                    await pickup.save();
                    logger_1.default.warn(`⚠️ Pickup ${pickup._id} permanently expired after 2 hours.`);
                }
                else {
                    // Re-dispatch or keep offer active in zone
                    await dispatch_service_1.default.dispatchPickupRequest(pickup._id);
                }
            }
        }
    }
    catch (error) {
        logger_1.default.error(`Error in checkExpiredOffers job: ${error.message}`);
    }
};
exports.checkExpiredOffers = checkExpiredOffers;
/**
 * Starts the recurring 10-second MongoDB polling job
 */
const startOfferTimeoutJob = (intervalMs = 4000) => {
    if (intervalId)
        return; // Prevent duplicate timers
    logger_1.default.info(`🕒 Offer timeout checker started (runs every ${intervalMs / 1000}s)`);
    intervalId = setInterval(exports.checkExpiredOffers, intervalMs);
};
exports.startOfferTimeoutJob = startOfferTimeoutJob;
/**
 * Stops the job (useful during graceful shutdown)
 */
const stopOfferTimeoutJob = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger_1.default.info('🛑 Offer timeout checker stopped');
    }
};
exports.stopOfferTimeoutJob = stopOfferTimeoutJob;
exports.default = {
    startOfferTimeoutJob: exports.startOfferTimeoutJob,
    stopOfferTimeoutJob: exports.stopOfferTimeoutJob,
    checkExpiredOffers: exports.checkExpiredOffers,
};
