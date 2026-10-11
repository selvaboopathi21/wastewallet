"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPickupRatings = exports.getUserRatings = exports.submitRating = void 0;
// Rating Service: Post-pickup ratings, rolling average calculations, and reputation badges
const mongoose_1 = require("mongoose");
const Rating_1 = __importDefault(require("../models/Rating"));
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 1. Submit a rating for a completed pickup (Customer rates Collector, or Collector rates Customer)
 */
const submitRating = async ({ requestId, fromUserId, stars, tags = [], comment = '', }) => {
    // Validate star range (1 to 5)
    if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5) {
        throw new ApiError_1.default(400, 'Star rating must be an integer between 1 and 5');
    }
    const pickup = await PickupRequest_1.default.findById(requestId);
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found');
    }
    // Enforce rule: only completed and paid pickups can be rated
    if (pickup.status !== 'completed' && pickup.status !== 'paid') {
        throw new ApiError_1.default(400, `Cannot submit rating. Pickup must be "completed" or "paid", but current status is "${pickup.status}".`);
    }
    // Determine target user (who is being rated)
    let toUserId = null;
    const fromObjId = new mongoose_1.Types.ObjectId(fromUserId);
    if (pickup.customerId.toString() === fromUserId) {
        // Customer is rating the Collector
        if (!pickup.collectorId) {
            throw new ApiError_1.default(400, 'Cannot rate: no collector assigned to this pickup');
        }
        toUserId = pickup.collectorId;
    }
    else if (pickup.collectorId && pickup.collectorId.toString() === fromUserId) {
        // Collector is rating the Customer
        toUserId = pickup.customerId;
    }
    else {
        throw new ApiError_1.default(403, 'You are not a participant in this pickup and cannot submit a rating');
    }
    // Enforce rule: Only one rating per user per pickup
    const existing = await Rating_1.default.findOne({ requestId: pickup._id, fromUserId: fromObjId });
    if (existing) {
        throw new ApiError_1.default(409, 'You have already submitted a rating for this pickup');
    }
    // Create Rating document
    const ratingDoc = await Rating_1.default.create({
        requestId: pickup._id,
        fromUserId: fromObjId,
        toUserId,
        stars: Math.round(stars),
        tags,
        comment: comment.trim(),
    });
    // Update target user's rolling average rating:
    // newAvg = ((oldAvg * oldCount) + stars) / (oldCount + 1)
    const targetUser = await User_1.default.findById(toUserId);
    if (targetUser) {
        const currentCount = targetUser.rating?.count || 0;
        const currentAvg = targetUser.rating?.avg || 0;
        const newCount = currentCount + 1;
        const newAvg = Number((((currentAvg * currentCount) + stars) / newCount).toFixed(2));
        targetUser.rating = {
            avg: newAvg,
            count: newCount,
        };
        // Quality Rule: Alert or flag if collector rating drops below 2.5 after 3+ reviews
        if (targetUser.role === 'collector' && newCount >= 3 && newAvg < 2.5) {
            logger_1.default.warn(`⚠️ Warning: Collector "${targetUser.name || targetUser.phone}" has low rating: ${newAvg} stars (${newCount} reviews)`);
        }
        await targetUser.save();
        logger_1.default.info(`⭐ Rating recorded for ${targetUser.role} "${targetUser.name || targetUser.phone}": ${stars} stars. New average: ${newAvg} (${newCount} ratings)`);
    }
    return {
        rating: ratingDoc,
        targetUserRating: targetUser?.rating,
    };
};
exports.submitRating = submitRating;
/**
 * 2. Get ratings received by a specific user
 */
const getUserRatings = async (userId) => {
    return await Rating_1.default.find({ toUserId: new mongoose_1.Types.ObjectId(userId) })
        .populate('fromUserId', 'name role')
        .sort({ createdAt: -1 });
};
exports.getUserRatings = getUserRatings;
/**
 * 3. Get ratings submitted for a specific pickup
 */
const getPickupRatings = async (requestId) => {
    return await Rating_1.default.find({ requestId: new mongoose_1.Types.ObjectId(requestId) })
        .populate('fromUserId', 'name role')
        .populate('toUserId', 'name role');
};
exports.getPickupRatings = getPickupRatings;
exports.default = {
    submitRating: exports.submitRating,
    getUserRatings: exports.getUserRatings,
    getPickupRatings: exports.getPickupRatings,
};
