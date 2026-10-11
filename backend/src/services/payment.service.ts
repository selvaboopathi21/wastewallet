// Payment Service: Handles cash settlement, idempotent records, and completes pickups
import { Types } from 'mongoose';
import PickupRequest from '../models/PickupRequest';
import Payment from '../models/Payment';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { IPayment, IPickupRequest } from '../types';

/**
 * Collector records on-site cash payment after customer has OTP-confirmed
 */
export const processCashPayment = async (
  pickupId: string,
  collectorId: string
): Promise<{ pickup: IPickupRequest; payment: IPayment }> => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to you');
  }

  if (pickup.status !== 'confirmed') {
    throw new ApiError(
      400,
      `Cannot record payment while status is "${pickup.status}". Customer must confirm with OTP first.`
    );
  }

  // Idempotency: Check if payment record already exists
  let payment = await Payment.findOne({ requestId: pickup._id });
  if (payment) {
    logger.warn(`Payment record already exists for pickup ${pickupId}. Returning existing payment.`);
  } else {
    // Create new payment record
    payment = await Payment.create({
      requestId: pickup._id,
      method: 'cash',
      amountPaise: pickup.totalAmountPaise,
      status: 'completed',
      idempotencyKey: `cash_${pickup._id}`,
      paidAt: new Date(),
    });
  }

  // Update status: confirmed ➔ paid
  pickup.status = 'paid';
  await pickup.save();

  logger.info(
    `💵 Cash payment of ₹${(pickup.totalAmountPaise / 100).toFixed(2)} recorded for pickup ${pickup._id}`
  );

  // Real-Time Socket.io: Notify customer and collector of payment
  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitStatusChanged(pickup._id.toString(), {
      pickupId: pickup._id,
      requestId: pickup._id,
      newStatus: 'paid',
    });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
  }

  return {
    pickup,
    payment,
  };
};

/**
 * Collector finalizes pickup: paid ➔ completed
 */
export const completePickup = async (
  pickupId: string,
  collectorId: string
): Promise<IPickupRequest> => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to you');
  }

  if (pickup.status !== 'paid') {
    throw new ApiError(400, `Cannot complete pickup. Current status must be "paid", but is "${pickup.status}".`);
  }

  // Update status: paid ➔ completed
  pickup.status = 'completed';
  await pickup.save();

  logger.info(`🏁 Pickup ${pickup._id} successfully completed!`);

  // Real-Time Socket.io: Notify customer and collector of completion
  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitStatusChanged(pickup._id.toString(), {
      pickupId: pickup._id,
      requestId: pickup._id,
      newStatus: 'completed',
    });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.status.changed: ${err.message}`);
  }

  return pickup;
};

export default {
  processCashPayment,
  completePickup,
};
