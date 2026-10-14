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
exports.transitionPickupStatus = exports.declinePickup = exports.atomicAcceptPickup = exports.dispatchPickupRequest = exports.computeCollectorScore = exports.calculateDistanceKm = void 0;
// Dispatch Service: Core matching engine, scoring algorithm, atomic accept, and status transitions
const mongoose_1 = require("mongoose");
const User_1 = __importDefault(require("../models/User"));
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
const constants_1 = require("../utils/constants");
/**
 * Calculates distance in kilometers between two [longitude, latitude] coordinates (Haversine formula)
 */
const calculateDistanceKm = (coord1, coord2) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.calculateDistanceKm = calculateDistanceKm;
/**
 * Calculates a match score for a collector based on:
 * Score = (Rating * 20) + (AcceptanceRate * 0.5) - (ActiveJobs * 25) - (DistanceKm * 10)
 */
const computeCollectorScore = (collector, customerCoords, activeJobsCount) => {
    const collectorCoords = collector.location?.coordinates || [0, 0];
    const distanceKm = (0, exports.calculateDistanceKm)(customerCoords, collectorCoords);
    const ratingPoints = (collector.rating?.avg || 3.5) * 20; // 0 to 100 points
    const acceptancePoints = (collector.acceptanceRate || 100) * 0.5; // 0 to 50 points
    const workloadPenalty = activeJobsCount * 25; // -25 points per active job
    const distancePenalty = distanceKm * 10; // -10 points per km
    return ratingPoints + acceptancePoints - workloadPenalty - distancePenalty;
};
exports.computeCollectorScore = computeCollectorScore;
/**
 * Finds eligible online collectors in the zone who haven't been offered this job yet,
 * scores them, and offers the job to the best one for 60 seconds.
 */
const dispatchPickupRequest = async (pickupId) => {
    const pickup = await PickupRequest_1.default.findById(pickupId);
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found');
    }
    // 1. Prioritize active, online collectors strictly in this pickup's zone
    let eligibleCollectors = await User_1.default.find({
        role: 'collector',
        isApproved: true,
        isOnline: true,
        isBlocked: false,
        zoneId: pickup.zoneId,
        _id: { $nin: pickup.offeredTo },
    });
    // 2. If none in this specific zone, include collectors with unassigned zones
    if (eligibleCollectors.length === 0) {
        eligibleCollectors = await User_1.default.find({
            role: 'collector',
            isApproved: true,
            isOnline: true,
            isBlocked: false,
            $or: [
                { zoneId: null },
                { zoneId: { $exists: false } },
            ],
            _id: { $nin: pickup.offeredTo },
        });
    }
    // 3. Fallback: If still none, offer to any approved online collector in the city
    if (eligibleCollectors.length === 0) {
        eligibleCollectors = await User_1.default.find({
            role: 'collector',
            isApproved: true,
            isOnline: true,
            isBlocked: false,
            _id: { $nin: pickup.offeredTo },
        });
    }
    if (eligibleCollectors.length === 0) {
        // If all collectors in offeredTo were already cycled through, check pickup age
        const now = Date.now();
        const pickupAgeMs = now - new Date(pickup.createdAt).getTime();
        // Only mark permanently expired if older than 2 hours
        if (pickupAgeMs > 2 * 60 * 60 * 1000) {
            if (pickup.status === 'offered' || pickup.status === 'pending') {
                pickup.status = 'expired';
                pickup.currentOfferCollectorId = null;
                pickup.offerExpiresAt = null;
                await pickup.save();
                logger_1.default.warn(`⚠️ Pickup ${pickup._id} permanently expired after 2 hours.`);
            }
            return pickup;
        }
        // Otherwise, keep the offer open in the zone for other collectors
        pickup.status = 'offered';
        pickup.currentOfferCollectorId = null;
        pickup.noCollectorsAvailable = true;
        pickup.offerExpiresAt = new Date(now + 60 * 60 * 1000); // 1 hour open pool
        // Keep pickup.offeredTo intact so collectors who passed on it are not re-offered
        await pickup.save();
        logger_1.default.info(`📢 Pickup ${pickup._id} kept active as open broadcast in zone (No single collector available).`);
        try {
            const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
            await pickup.populate('customerId', 'name phone address');
            await pickup.populate('zoneId', 'name');
            sockets.emitPickupOffered('all', {
                pickupId: pickup._id.toString(),
                pickup,
            });
            // Notify customer real-time that no collectors are currently free
            sockets.emitStatusChanged(pickup._id.toString(), {
                newStatus: 'offered',
                collectorId: null,
                noCollectorsAvailable: true,
            });
        }
        catch (err) {
            logger_1.default.warn(`Could not emit Socket event pickup.offered: ${err.message}`);
        }
        return pickup;
    }
    // Count active jobs for each collector to prevent overloading
    const activeJobCounts = await PickupRequest_1.default.aggregate([
        {
            $match: {
                collectorId: { $in: eligibleCollectors.map((c) => c._id) },
                status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed'] },
            },
        },
        { $group: { _id: '$collectorId', count: { $sum: 1 } } },
    ]);
    const workloadMap = new Map();
    activeJobCounts.forEach((item) => workloadMap.set(item._id.toString(), item.count));
    // Score each collector
    const customerCoords = pickup.location.coordinates;
    const scoredCollectors = eligibleCollectors.map((c) => ({
        collector: c,
        score: (0, exports.computeCollectorScore)(c, customerCoords, workloadMap.get(c._id.toString()) || 0),
    }));
    // Sort descending (highest score first)
    scoredCollectors.sort((a, b) => b.score - a.score);
    const bestCandidate = scoredCollectors[0].collector;
    // Set 20-second offer timeout so collectors have a fast active window, minimizing customer waiting time
    const offerExpiresAt = new Date(Date.now() + 20 * 1000);
    pickup.status = 'offered';
    pickup.currentOfferCollectorId = bestCandidate._id;
    pickup.offerExpiresAt = offerExpiresAt;
    pickup.noCollectorsAvailable = false;
    pickup.offeredTo.push(bestCandidate._id);
    await pickup.save();
    logger_1.default.info(`📢 Offered pickup ${pickup._id} to Collector "${bestCandidate.name || bestCandidate.phone}" (20s response timer)`);
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        await pickup.populate('customerId', 'name phone address');
        await pickup.populate('zoneId', 'name');
        sockets.emitPickupOffered(bestCandidate._id.toString(), {
            pickupId: pickup._id.toString(),
            pickup,
        });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.offered: ${err.message}`);
    }
    return pickup;
};
exports.dispatchPickupRequest = dispatchPickupRequest;
/**
 * Atomic Accept: ONE conditional MongoDB query ensures only one collector can win the job
 */
const atomicAcceptPickup = async (pickupId, collectorId) => {
    const collector = await User_1.default.findById(collectorId);
    if (!collector || !collector.isApproved) {
        throw new ApiError_1.default(403, 'Your account is pending review by Admin. You cannot accept pickups until approved.');
    }
    const now = new Date();
    // Atomically update ONLY if status is still 'offered' (or 'pending') AND not expired
    const acceptedPickup = await PickupRequest_1.default.findOneAndUpdate({
        _id: pickupId,
        status: { $in: ['offered', 'pending'] },
        $or: [
            { currentOfferCollectorId: new mongoose_1.Types.ObjectId(collectorId) },
            { currentOfferCollectorId: null },
            { currentOfferCollectorId: { $exists: false } },
            { offerExpiresAt: { $gt: now } },
            { offerExpiresAt: null },
        ],
    }, {
        $set: {
            status: 'accepted',
            collectorId: new mongoose_1.Types.ObjectId(collectorId),
            currentOfferCollectorId: null,
            offerExpiresAt: null,
            noCollectorsAvailable: false,
        },
    }, { new: true });
    if (!acceptedPickup) {
        throw new ApiError_1.default(409, 'Could not accept this pickup. The offer may have expired or was accepted by another collector.');
    }
    logger_1.default.info(`🤝 Collector ${collectorId} atomically accepted pickup ${pickupId}!`);
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitStatusChanged(pickupId, { newStatus: 'accepted', collectorId });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
    }
    return acceptedPickup;
};
exports.atomicAcceptPickup = atomicAcceptPickup;
/**
 * Collector explicitly declines: Moves request immediately to the next collector
 */
const declinePickup = async (pickupId, collectorId) => {
    const collectorObjId = new mongoose_1.Types.ObjectId(collectorId);
    // Find active pickup request that is offered or pending
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        status: { $in: ['offered', 'pending'] },
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'No active pickup offer found for this ID');
    }
    // Record collector in declinedBy so getMyOffers permanently filters it out
    if (!pickup.declinedBy) {
        pickup.declinedBy = [];
    }
    if (!pickup.declinedBy.some((id) => id.toString() === collectorId)) {
        pickup.declinedBy.push(collectorObjId);
    }
    // Add collector to offeredTo so dispatch algorithm moves to other candidates
    if (!pickup.offeredTo.some((id) => id.toString() === collectorId)) {
        pickup.offeredTo.push(collectorObjId);
    }
    // If this collector was currently designated, clear currentOfferCollectorId
    if (pickup.currentOfferCollectorId && pickup.currentOfferCollectorId.toString() === collectorId) {
        pickup.currentOfferCollectorId = null;
    }
    await pickup.save();
    logger_1.default.info(`Collector ${collectorId} declined pickup ${pickupId}. Finding next collector...`);
    return await (0, exports.dispatchPickupRequest)(pickup._id);
};
exports.declinePickup = declinePickup;
/**
 * Enforces the strict sequential status machine:
 * accepted -> on_the_way -> arrived
 */
const transitionPickupStatus = async (pickupId, collectorId, newStatus) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found or not assigned to this collector');
    }
    // Enforce sequential transition rule
    if (!(0, constants_1.isValidStatusTransition)(pickup.status, newStatus)) {
        throw new ApiError_1.default(400, `Invalid status transition: cannot change from "${pickup.status}" to "${newStatus}"`);
    }
    const oldStatus = pickup.status;
    pickup.status = newStatus;
    await pickup.save();
    logger_1.default.info(`Status transition for pickup ${pickupId}: ${oldStatus} ➔ ${newStatus}`);
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        sockets.emitStatusChanged(pickupId, { newStatus, previousStatus: oldStatus });
    }
    catch (err) {
        logger_1.default.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
    }
    return pickup;
};
exports.transitionPickupStatus = transitionPickupStatus;
exports.default = {
    calculateDistanceKm: exports.calculateDistanceKm,
    computeCollectorScore: exports.computeCollectorScore,
    dispatchPickupRequest: exports.dispatchPickupRequest,
    atomicAcceptPickup: exports.atomicAcceptPickup,
    declinePickup: exports.declinePickup,
    transitionPickupStatus: exports.transitionPickupStatus,
};
