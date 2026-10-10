// Collector Controller: HTTP endpoints for scrap collectors
import { Request, Response } from 'express';
import dispatchService from '../services/dispatch.service';
import PickupRequest from '../models/PickupRequest';
import User from '../models/User';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';
import { PickupStatus } from '../types';

// PATCH /api/v1/collector/status (Go Online / Offline)
export const toggleOnlineStatus = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id;
  const { isOnline } = req.body;

  if (typeof isOnline !== 'boolean') {
    throw new ApiError(400, 'isOnline must be a boolean (true or false)');
  }

  const collector = await User.findByIdAndUpdate(
    collectorId,
    { isOnline },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: `Collector is now ${isOnline ? 'Online (Ready for pickups)' : 'Offline'}`,
    data: { isOnline: collector?.isOnline },
  });
});

// GET /api/v1/collector/offers (Get pending job offers for this collector)
export const getMyOffers = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id;
  const now = new Date();

  // Find active, unexpired offers currently held by this collector
  const offers = await PickupRequest.find({
    status: 'offered',
    currentOfferCollectorId: collectorId,
    offerExpiresAt: { $gt: now },
  })
    .populate('customerId', 'name phone')
    .populate('zoneId', 'name');

  res.status(200).json({
    success: true,
    message: 'Pending offers retrieved successfully',
    data: { offers },
  });
});

// POST /api/v1/collector/pickups/:id/accept (Atomic Accept)
export const acceptPickupOffer = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;

  const acceptedPickup = await dispatchService.atomicAcceptPickup(id as string, collectorId);

  res.status(200).json({
    success: true,
    message: 'Pickup offer accepted successfully! You are now assigned to this pickup.',
    data: { pickup: acceptedPickup },
  });
});

// POST /api/v1/collector/pickups/:id/decline (Decline offer)
export const declinePickupOffer = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;

  await dispatchService.declinePickup(id as string, collectorId);

  res.status(200).json({
    success: true,
    message: 'Offer declined. It has been moved to the next available collector.',
  });
});

// PATCH /api/v1/collector/pickups/:id/status (Transition status e.g. on_the_way, arrived)
export const updatePickupStatus = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, 'New status is required');
  }

  const updatedPickup = await dispatchService.transitionPickupStatus(
    id as string,
    collectorId,
    status as PickupStatus
  );

  res.status(200).json({
    success: true,
    message: `Pickup status updated to "${status}"`,
    data: { pickup: updatedPickup },
  });
});

// GET /api/v1/collector/active-jobs
export const getActiveJobs = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id;

  const activeJobs = await PickupRequest.find({
    collectorId,
    status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed', 'confirmed'] },
  })
    .populate('customerId', 'name phone')
    .populate('zoneId', 'name')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Active collector jobs retrieved successfully',
    data: { activeJobs },
  });
});

export default {
  toggleOnlineStatus,
  getMyOffers,
  acceptPickupOffer,
  declinePickupOffer,
  updatePickupStatus,
  getActiveJobs,
};
