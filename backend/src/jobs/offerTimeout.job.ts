// Offer Timeout Background Job: Checks MongoDB for expired 60-second offers every 10 seconds
import PickupRequest from '../models/PickupRequest';
import dispatchService from '../services/dispatch.service';
import logger from '../utils/logger';

let intervalId: NodeJS.Timeout | null = null;

export const checkExpiredOffers = async (): Promise<void> => {
  try {
    const now = new Date();

    // Query MongoDB directly for any offers where the 60-second timer has run out
    const expiredOffers = await PickupRequest.find({
      status: 'offered',
      offerExpiresAt: { $lte: now },
    });

    if (expiredOffers.length > 0) {
      logger.info(`⏱️ Found ${expiredOffers.length} expired offer(s). Re-routing to next collectors...`);

      for (const pickup of expiredOffers) {
        logger.info(
          `Offer expired for pickup ${pickup._id} (Collector ${pickup.currentOfferCollectorId}). Re-dispatching...`
        );
        await dispatchService.dispatchPickupRequest(pickup._id);
      }
    }
  } catch (error: any) {
    logger.error(`Error in checkExpiredOffers job: ${error.message}`);
  }
};

/**
 * Starts the recurring 10-second MongoDB polling job
 */
export const startOfferTimeoutJob = (intervalMs = 10000): void => {
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
