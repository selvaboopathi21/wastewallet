"use strict";
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
    // Find all active, approved, online collectors in this zone who haven't rejected yet
    const eligibleCollectors = await User_1.default.find({
        role: 'collector',
        isApproved: true,
        isOnline: true,
        isBlocked: false,
        zoneId: pickup.zoneId,
        _id: { $nin: pickup.offeredTo },
    });
    if (eligibleCollectors.length === 0) {
        // If no more collectors are available, mark the request expired
        if (pickup.status === 'offered' || pickup.status === 'pending') {
            pickup.status = 'expired';
            pickup.currentOfferCollectorId = null;
            pickup.offerExpiresAt = null;
            await pickup.save();
            logger_1.default.warn(`⚠️ Pickup ${pickup._id} expired: No eligible collectors available in zone.`);
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
    // Set 60-second offer timeout
    const offerExpiresAt = new Date(Date.now() + 60 * 1000);
    pickup.status = 'offered';
    pickup.currentOfferCollectorId = bestCandidate._id;
    pickup.offerExpiresAt = offerExpiresAt;
    pickup.offeredTo.push(bestCandidate._id);
    await pickup.save();
    logger_1.default.info(`📢 Offered pickup ${pickup._id} to Collector "${bestCandidate.name || bestCandidate.phone}" (Expires in 60s)`);
    return pickup;
};
exports.dispatchPickupRequest = dispatchPickupRequest;
/**
 * Atomic Accept: ONE conditional MongoDB query ensures only one collector can win the job
 */
const atomicAcceptPickup = async (pickupId, collectorId) => {
    const now = new Date();
    // Atomically update ONLY if status is still 'offered' AND offered to this collector AND not expired
    const acceptedPickup = await PickupRequest_1.default.findOneAndUpdate({
        _id: pickupId,
        status: 'offered',
        currentOfferCollectorId: new mongoose_1.Types.ObjectId(collectorId),
        offerExpiresAt: { $gt: now },
    }, {
        $set: {
            status: 'accepted',
            collectorId: new mongoose_1.Types.ObjectId(collectorId),
            currentOfferCollectorId: null,
            offerExpiresAt: null,
        },
    }, { new: true });
    if (!acceptedPickup) {
        throw new ApiError_1.default(409, 'Could not accept this pickup. The offer may have expired or was accepted by another collector.');
    }
    logger_1.default.info(`🤝 Collector ${collectorId} atomically accepted pickup ${pickupId}!`);
    return acceptedPickup;
};
exports.atomicAcceptPickup = atomicAcceptPickup;
/**
 * Collector explicitly declines: Moves request immediately to the next collector
 */
const declinePickup = async (pickupId, collectorId) => {
    const pickup = await PickupRequest_1.default.findOne({
        _id: pickupId,
        status: 'offered',
        currentOfferCollectorId: new mongoose_1.Types.ObjectId(collectorId),
    });
    if (!pickup) {
        throw new ApiError_1.default(400, 'No active offer found for this collector on this pickup');
    }
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
    pickup.status = newStatus;
    await pickup.save();
    logger_1.default.info(`Status transition for pickup ${pickupId}: ${pickup.status} ➔ ${newStatus}`);
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
