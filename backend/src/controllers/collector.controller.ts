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

  const collector = await User.findById(collectorId);
  if (!collector) {
    throw new ApiError(404, 'Collector not found');
  }

  // Strict approval enforcement: unapproved collectors cannot go online!
  if (isOnline && !collector.isApproved) {
    throw new ApiError(
      403,
      'Your account is pending review by Admin. You cannot go online until approved.'
    );
  }

  collector.isOnline = isOnline;
  await collector.save();

  res.status(200).json({
    success: true,
    message: `Collector is now ${isOnline ? 'Online (Ready for pickups)' : 'Offline'}`,
    data: { isOnline: collector.isOnline, isApproved: collector.isApproved },
  });
});

// GET /api/v1/collector/offers (Get pending job offers for this collector)
export const getMyOffers = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id;
  const isApproved = req.user!.isApproved;

  // Unapproved collectors must NOT receive any offers
  if (!isApproved) {
    return res.status(200).json({
      success: true,
      message: 'Pending Admin verification. No offers available until approved.',
      data: { offers: [] },
    });
  }

  const userZoneId = req.user!.zoneId;
  const now = new Date();

  // Find active, unexpired offers:
  // 1. Specifically offered to this collector (currentOfferCollectorId = collectorId)
  // 2. OR open broadcast in their zone (currentOfferCollectorId = null / unset)
  const recipientCondition = userZoneId
    ? {
        $or: [
          { currentOfferCollectorId: collectorId },
          {
            $and: [
              {
                $or: [
                  { currentOfferCollectorId: null },
                  { currentOfferCollectorId: { $exists: false } },
                ],
              },
              {
                $or: [
                  { zoneId: userZoneId },
                  { zoneId: null },
                  { zoneId: { $exists: false } },
                  { noCollectorsAvailable: true },
                ],
              },
            ],
          },
        ],
      }
    : {
        $or: [
          { currentOfferCollectorId: collectorId },
          { currentOfferCollectorId: null },
          { currentOfferCollectorId: { $exists: false } },
        ],
      };

  const offers = await PickupRequest.find({
    status: { $in: ['offered', 'pending'] },
    declinedBy: { $nin: [collectorId] }, // Exclude only if this collector explicitly passed on this offer
    ...recipientCondition,
    $and: [
      {
        $or: [
          { offerExpiresAt: { $gt: now } },
          { offerExpiresAt: null },
        ],
      },
    ],
  })
    .populate('customerId', 'name phone address')
    .populate('zoneId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Pending offers retrieved successfully',
    data: { offers },
  });
});

// POST /api/v1/collector/pickups/:id/accept (Atomic Accept)
export const acceptPickupOffer = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const isApproved = req.user!.isApproved;

  if (!isApproved) {
    throw new ApiError(
      403,
      'Your account is pending review by Admin. You cannot accept pickups until verified.'
    );
  }

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
  const isApproved = req.user!.isApproved;

  if (!isApproved) {
    throw new ApiError(
      403,
      'Your account is pending review by Admin. You cannot execute pickups until verified.'
    );
  }

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
  const isApproved = req.user!.isApproved;

  if (!isApproved) {
    return res.status(200).json({
      success: true,
      message: 'Pending Admin verification. No active jobs.',
      data: {
        activeJobs: [],
        completedJobs: [],
        stats: { completedToday: 0, totalWeightKg: 0, totalCashPaid: 0 },
      },
    });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [activeJobs, completedTodayJobs] = await Promise.all([
    PickupRequest.find({
      collectorId,
      status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed', 'confirmed'] },
    })
      .populate('customerId', 'name phone address')
      .populate('zoneId', 'name')
      .sort({ updatedAt: -1 }),

    PickupRequest.find({
      collectorId,
      status: { $in: ['paid', 'completed'] },
      updatedAt: { $gte: startOfToday },
    })
      .populate('customerId', 'name phone address')
      .populate('zoneId', 'name')
      .sort({ updatedAt: -1 }),
  ]);

  const totalCashPaise = completedTodayJobs.reduce((acc, j) => acc + (j.totalAmountPaise || 0), 0);
  const totalWeightKg = completedTodayJobs.reduce((acc, j) => acc + (j.totalPickupWeightKg || 0), 0);

  res.status(200).json({
    success: true,
    message: 'Active collector jobs retrieved successfully',
    data: {
      activeJobs,
      completedJobs: completedTodayJobs,
      stats: {
        completedToday: completedTodayJobs.length,
        totalWeightKg: Number(totalWeightKg.toFixed(1)),
        totalCashPaid: Number((totalCashPaise / 100).toFixed(0)),
      },
    },
  });
});

// POST /api/v1/collector/pickups/:id/weights (Enter on-site weights)
export const recordWeights = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;
  const { mode, items, scalePhotos } = req.body;

  const pricingService = (await import('../services/pricing.service')).default;
  const result = await pricingService.recordWeighedItems({
    pickupId: id as string,
    collectorId,
    mode: mode || 'separate',
    items,
    scalePhotoUrls: scalePhotos || [],
  });

  res.status(200).json({
    success: true,
    message: `Weights recorded successfully. Total: ₹${(result.pickup.totalAmountPaise / 100).toFixed(2)}`,
    data: {
      pickup: result.pickup,
      items: result.items,
    },
  });
});

// POST /api/v1/collector/pickups/:id/request-otp (Trigger confirmation OTP to customer)
export const requestConfirmationOtp = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;

  const pricingService = (await import('../services/pricing.service')).default;
  const result = await pricingService.requestCustomerConfirmationOtp(id as string, collectorId);

  res.status(200).json({
    success: true,
    message: `6-digit confirmation OTP sent to customer (${result.phone})`,
    data: result,
  });
});

// POST /api/v1/collector/pickups/:id/pay-cash (Collector marks cash paid)
export const recordCashPayment = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;

  const paymentService = (await import('../services/payment.service')).default;
  const result = await paymentService.processCashPayment(id as string, collectorId);

  res.status(200).json({
    success: true,
    message: `Cash payment of ₹${(result.pickup.totalAmountPaise / 100).toFixed(2)} recorded successfully`,
    data: result,
  });
});

// POST /api/v1/collector/pickups/:id/complete (Collector finalizes completed pickup)
export const finishPickup = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;

  const paymentService = (await import('../services/payment.service')).default;
  const completedPickup = await paymentService.completePickup(id as string, collectorId);

  res.status(200).json({
    success: true,
    message: 'Pickup marked completed successfully!',
    data: { pickup: completedPickup },
  });
});

// POST /api/v1/collector/pickups/:id/respond-separate (Collector accepts/declines separate price request)
export const respondSeparatePrice = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id.toString();
  const { id } = req.params;
  const { action, declineReason } = req.body;

  const pricingService = (await import('../services/pricing.service')).default;
  const updatedPickup = await pricingService.respondSeparatePrice(
    id as string,
    collectorId,
    action,
    declineReason
  );

  res.status(200).json({
    success: true,
    message: `Separate price request ${action}ed successfully`,
    data: { pickup: updatedPickup },
  });
});

// POST /api/v1/collector/activate (Auto-approve and activate collector partner)
export const activateCollector = asyncHandler(async (req: Request, res: Response) => {
  const collectorId = req.user!._id;
  const User = (await import('../models/User')).default;
  const user = await User.findById(collectorId);
  if (!user) throw new ApiError(404, 'Collector account not found');

  user.role = 'collector';
  user.isApproved = true;
  user.isOnline = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Collector partner account verified and activated successfully!',
    data: { user },
  });
});

export default {
  toggleOnlineStatus,
  getMyOffers,
  acceptPickupOffer,
  declinePickupOffer,
  updatePickupStatus,
  getActiveJobs,
  recordWeights,
  requestConfirmationOtp,
  recordCashPayment,
  finishPickup,
  respondSeparatePrice,
  activateCollector,
};

