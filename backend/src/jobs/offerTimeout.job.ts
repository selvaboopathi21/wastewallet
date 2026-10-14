// Offer Timeout Background Job: Checks MongoDB for expired 60-second offers every 10 seconds
import PickupRequest from '../models/PickupRequest';
import dispatchService from '../services/dispatch.service';
import logger from '../utils/logger';

let intervalId: NodeJS.Timeout | null = null;

export const checkExpiredOffers = async (): Promise<void> => {
  try {
    const now = new Date();

    // Query MongoDB directly for any offers where the timer has run out
    const expiredOffers = await PickupRequest.find({
      status: 'offered',
      offerExpiresAt: { $lte: now },
    });

    if (expiredOffers.length > 0) {
      logger.info(`⏱️ Found ${expiredOffers.length} timed-out offer(s). Re-routing or extending pool...`);

      for (const pickup of expiredOffers) {
        const pickupAgeMs = now.getTime() - new Date(pickup.createdAt).getTime();

        // If pickup request is older than 2 hours, permanently expire it
        if (pickupAgeMs > 2 * 60 * 60 * 1000) {
          pickup.status = 'expired';
          pickup.currentOfferCollectorId = null;
          pickup.offerExpiresAt = null;
          await pickup.save();
          logger.warn(`⚠️ Pickup ${pickup._id} permanently expired after 2 hours.`);
        } else {
          // Re-dispatch or keep offer active in zone
          await dispatchService.dispatchPickupRequest(pickup._id);
        }
      }
    }
  } catch (error: any) {
    logger.error(`Error in checkExpiredOffers job: ${error.message}`);
  }
};

/**
 * Starts the recurring 10-second MongoDB polling job
 */
export const startOfferTimeoutJob = (intervalMs = 4000): void => {
  if (intervalId) return; // Prevent duplicate timers

  logger.info(`🕒 Offer timeout checker started (runs every ${intervalMs / 1000}s)`);
  intervalId = setInterval(checkExpiredOffers, intervalMs);
};

/**
 * Stops the job (useful during graceful shutdown)
 */
export const stopOfferTimeoutJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('🛑 Offer timeout checker stopped');
  }
};

export default {
  startOfferTimeoutJob,
  stopOfferTimeoutJob,
  checkExpiredOffers,
};
