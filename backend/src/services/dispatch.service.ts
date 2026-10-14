// Dispatch Service: Core matching engine, scoring algorithm, atomic accept, and status transitions
import { Types } from 'mongoose';
import User from '../models/User';
import PickupRequest from '../models/PickupRequest';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { isValidStatusTransition } from '../utils/constants';
import { IPickupRequest, IUser, PickupStatus } from '../types';

/**
 * Calculates distance in kilometers between two [longitude, latitude] coordinates (Haversine formula)
 */
export const calculateDistanceKm = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates a match score for a collector based on:
 * Score = (Rating * 20) + (AcceptanceRate * 0.5) - (ActiveJobs * 25) - (DistanceKm * 10)
 */
export const computeCollectorScore = (
  collector: IUser,
  customerCoords: [number, number],
  activeJobsCount: number
): number => {
  const collectorCoords: [number, number] = collector.location?.coordinates || [0, 0];
  const distanceKm = calculateDistanceKm(customerCoords, collectorCoords);

  const ratingPoints = (collector.rating?.avg || 3.5) * 20; // 0 to 100 points
  const acceptancePoints = (collector.acceptanceRate || 100) * 0.5; // 0 to 50 points
  const workloadPenalty = activeJobsCount * 25; // -25 points per active job
  const distancePenalty = distanceKm * 10; // -10 points per km

  return ratingPoints + acceptancePoints - workloadPenalty - distancePenalty;
};

/**
 * Finds eligible online collectors in the zone who haven't been offered this job yet,
 * scores them, and offers the job to the best one for 60 seconds.
 */
export const dispatchPickupRequest = async (
  pickupId: string | Types.ObjectId
): Promise<IPickupRequest | null> => {
  const pickup = await PickupRequest.findById(pickupId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  // 1. Prioritize active, online collectors strictly in this pickup's zone
  let eligibleCollectors = await User.find({
    role: 'collector',
    isApproved: true,
    isOnline: true,
    isBlocked: false,
    zoneId: pickup.zoneId,
    _id: { $nin: pickup.offeredTo },
  });

  // 2. If none in this specific zone, include collectors with unassigned zones
  if (eligibleCollectors.length === 0) {
    eligibleCollectors = await User.find({
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
    eligibleCollectors = await User.find({
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
        logger.warn(`⚠️ Pickup ${pickup._id} permanently expired after 2 hours.`);
      }
      return pickup;
    }

    // Otherwise, keep the offer open in the zone for other collectors
    pickup.status = 'offered';
    pickup.currentOfferCollectorId = null;
    pickup.offerExpiresAt = new Date(now + 60 * 60 * 1000); // 1 hour open pool
    // Keep pickup.offeredTo intact so collectors who passed on it are not re-offered
    await pickup.save();
    logger.info(`📢 Pickup ${pickup._id} kept active as open broadcast in zone.`);

    try {
      const sockets = (await import('../sockets')).default;
      await pickup.populate('customerId', 'name phone address');
      await pickup.populate('zoneId', 'name');
      sockets.emitPickupOffered('all', {
        pickupId: pickup._id.toString(),
        pickup,
      });
    } catch (err: any) {
      logger.warn(`Could not emit Socket event pickup.offered: ${err.message}`);
    }

    return pickup;
  }

  // Count active jobs for each collector to prevent overloading
  const activeJobCounts = await PickupRequest.aggregate([
    {
      $match: {
        collectorId: { $in: eligibleCollectors.map((c) => c._id) },
        status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed'] },
      },
    },
    { $group: { _id: '$collectorId', count: { $sum: 1 } } },
  ]);

  const workloadMap = new Map<string, number>();
  activeJobCounts.forEach((item) => workloadMap.set(item._id.toString(), item.count));

  // Score each collector
  const customerCoords = pickup.location.coordinates as [number, number];
  const scoredCollectors = eligibleCollectors.map((c) => ({
    collector: c,
    score: computeCollectorScore(c, customerCoords, workloadMap.get(c._id.toString()) || 0),
  }));

  // Sort descending (highest score first)
  scoredCollectors.sort((a, b) => b.score - a.score);
  const bestCandidate = scoredCollectors[0].collector;

  // Set 60-minute offer timeout so collectors have sufficient time to accept
  const offerExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  pickup.status = 'offered';
  pickup.currentOfferCollectorId = bestCandidate._id;
  pickup.offerExpiresAt = offerExpiresAt;
  pickup.offeredTo.push(bestCandidate._id);

  await pickup.save();
  logger.info(
    `📢 Offered pickup ${pickup._id} to Collector "${bestCandidate.name || bestCandidate.phone}" (Expires in 60 mins)`
  );

  try {
    const sockets = (await import('../sockets')).default;
    await pickup.populate('customerId', 'name phone address');
    await pickup.populate('zoneId', 'name');
    sockets.emitPickupOffered(bestCandidate._id.toString(), {
      pickupId: pickup._id.toString(),
      pickup,
    });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.offered: ${err.message}`);
  }

  return pickup;
};

/**
 * Atomic Accept: ONE conditional MongoDB query ensures only one collector can win the job
 */
export const atomicAcceptPickup = async (
  pickupId: string,
  collectorId: string
): Promise<IPickupRequest> => {
  const now = new Date();

  // Atomically update ONLY if status is still 'offered' (or 'pending') AND not expired
  const acceptedPickup = await PickupRequest.findOneAndUpdate(
    {
      _id: pickupId,
      status: { $in: ['offered', 'pending'] },
      $or: [
        { currentOfferCollectorId: new Types.ObjectId(collectorId) },
        { currentOfferCollectorId: null },
        { currentOfferCollectorId: { $exists: false } },
        { offerExpiresAt: { $gt: now } },
        { offerExpiresAt: null },
      ],
    },
    {
      $set: {
        status: 'accepted',
        collectorId: new Types.ObjectId(collectorId),
        currentOfferCollectorId: null,
        offerExpiresAt: null,
      },
    },
    { new: true }
  );

  if (!acceptedPickup) {
    throw new ApiError(
      409,
      'Could not accept this pickup. The offer may have expired or was accepted by another collector.'
    );
  }

  logger.info(`🤝 Collector ${collectorId} atomically accepted pickup ${pickupId}!`);

  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitStatusChanged(pickupId, { newStatus: 'accepted', collectorId });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
  }

  return acceptedPickup;
};

/**
 * Collector explicitly declines: Moves request immediately to the next collector
 */
export const declinePickup = async (
  pickupId: string,
  collectorId: string
): Promise<IPickupRequest | null> => {
  const collectorObjId = new Types.ObjectId(collectorId);

  // Find active pickup request that is offered or pending
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    status: { $in: ['offered', 'pending'] },
  });

  if (!pickup) {
    throw new ApiError(404, 'No active pickup offer found for this ID');
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
  logger.info(`Collector ${collectorId} declined pickup ${pickupId}. Finding next collector...`);
  return await dispatchPickupRequest(pickup._id);
};

/**
 * Enforces the strict sequential status machine:
 * accepted -> on_the_way -> arrived
 */
export const transitionPickupStatus = async (
  pickupId: string,
  collectorId: string,
  newStatus: PickupStatus
): Promise<IPickupRequest> => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to this collector');
  }

  // Enforce sequential transition rule
  if (!isValidStatusTransition(pickup.status, newStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition: cannot change from "${pickup.status}" to "${newStatus}"`
    );
  }

  const oldStatus = pickup.status;
  pickup.status = newStatus;
  await pickup.save();

  logger.info(`Status transition for pickup ${pickupId}: ${oldStatus} ➔ ${newStatus}`);

  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitStatusChanged(pickupId, { newStatus, previousStatus: oldStatus });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
  }

  return pickup;
};

export default {
  calculateDistanceKm,
  computeCollectorScore,
  dispatchPickupRequest,
  atomicAcceptPickup,
  declinePickup,
  transitionPickupStatus,
};
