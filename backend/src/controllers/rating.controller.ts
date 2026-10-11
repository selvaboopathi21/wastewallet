// Rating Controller: Handles requests for post-pickup ratings and feedback
import { Request, Response } from 'express';
import ratingService from '../services/rating.service';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

// POST /api/v1/ratings (Submit rating for a completed pickup)
export const submitRating = asyncHandler(async (req: Request, res: Response) => {
  const fromUserId = req.user!._id.toString();
  const { requestId, stars, tags, comment } = req.body;

  if (!requestId) {
    throw new ApiError(400, 'requestId is required');
  }

  if (stars === undefined || stars === null) {
    throw new ApiError(400, 'stars (1 to 5) is required');
  }

  const result = await ratingService.submitRating({
    requestId,
    fromUserId,
    stars: Number(stars),
    tags,
    comment,
  });

  res.status(201).json({
    success: true,
    message: `Rating of ${stars} stars submitted successfully`,
    data: result,
  });
});

// GET /api/v1/ratings/users/:userId (View all ratings received by a user)
export const getUserRatings = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const ratings = await ratingService.getUserRatings(userId as string);

  res.status(200).json({
    success: true,
    message: 'User ratings retrieved successfully',
    data: { ratings },
  });
});

// GET /api/v1/ratings/pickups/:requestId (View ratings for a specific pickup)
export const getPickupRatings = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const ratings = await ratingService.getPickupRatings(requestId as string);

  res.status(200).json({
    success: true,
    message: 'Pickup ratings retrieved successfully',
    data: { ratings },
  });
});

export default {
  submitRating,
  getUserRatings,
  getPickupRatings,
};
