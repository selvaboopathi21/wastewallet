// Rating Service: Post-pickup ratings, rolling average calculations, and reputation badges
import { Types } from 'mongoose';
import Rating from '../models/Rating';
import PickupRequest from '../models/PickupRequest';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';

export interface ISubmitRatingInput {
  requestId: string;
  fromUserId: string;
  stars: number;
  tags?: string[];
  comment?: string;
}

/**
 * 1. Submit a rating for a completed pickup (Customer rates Collector, or Collector rates Customer)
 */
export const submitRating = async ({
  requestId,
  fromUserId,
  stars,
  tags = [],
  comment = '',
}: ISubmitRatingInput) => {
  // Validate star range (1 to 5)
  if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5) {
    throw new ApiError(400, 'Star rating must be an integer between 1 and 5');
  }

  const pickup = await PickupRequest.findById(requestId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  // Enforce rule: only completed and paid pickups can be rated
  if (pickup.status !== 'completed' && pickup.status !== 'paid') {
    throw new ApiError(
      400,
      `Cannot submit rating. Pickup must be "completed" or "paid", but current status is "${pickup.status}".`
    );
  }

  // Determine target user (who is being rated)
  let toUserId: Types.ObjectId | null = null;
  const fromObjId = new Types.ObjectId(fromUserId);

  if (pickup.customerId.toString() === fromUserId) {
    // Customer is rating the Collector
    if (!pickup.collectorId) {
      throw new ApiError(400, 'Cannot rate: no collector assigned to this pickup');
    }
    toUserId = pickup.collectorId;
  } else if (pickup.collectorId && pickup.collectorId.toString() === fromUserId) {
    // Collector is rating the Customer
    toUserId = pickup.customerId;
  } else {
    throw new ApiError(403, 'You are not a participant in this pickup and cannot submit a rating');
  }

  // Enforce rule: Only one rating per user per pickup
  const existing = await Rating.findOne({ requestId: pickup._id, fromUserId: fromObjId });
  if (existing) {
    throw new ApiError(409, 'You have already submitted a rating for this pickup');
  }

  // Create Rating document
  const ratingDoc = await Rating.create({
    requestId: pickup._id,
    fromUserId: fromObjId,
    toUserId,
    stars: Math.round(stars),
    tags,
    comment: comment.trim(),
  });

  // Update target user's rolling average rating:
  // newAvg = ((oldAvg * oldCount) + stars) / (oldCount + 1)
  const targetUser = await User.findById(toUserId);
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
      logger.warn(
        `⚠️ Warning: Collector "${targetUser.name || targetUser.phone}" has low rating: ${newAvg} stars (${newCount} reviews)`
      );
    }

    await targetUser.save();
    logger.info(
      `⭐ Rating recorded for ${targetUser.role} "${targetUser.name || targetUser.phone}": ${stars} stars. New average: ${newAvg} (${newCount} ratings)`
    );
  }

  return {
    rating: ratingDoc,
    targetUserRating: targetUser?.rating,
  };
};

/**
 * 2. Get ratings received by a specific user
 */
export const getUserRatings = async (userId: string) => {
  return await Rating.find({ toUserId: new Types.ObjectId(userId) })
    .populate('fromUserId', 'name role')
    .sort({ createdAt: -1 });
};

/**
 * 3. Get ratings submitted for a specific pickup
 */
export const getPickupRatings = async (requestId: string) => {
  return await Rating.find({ requestId: new Types.ObjectId(requestId) })
    .populate('fromUserId', 'name role')
    .populate('toUserId', 'name role');
};

export default {
  submitRating,
  getUserRatings,
  getPickupRatings,
};
