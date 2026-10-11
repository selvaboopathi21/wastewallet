// Pricing Service: On-site weight calculations, rate snapshots, and customer OTP lock
import { Types } from 'mongoose';
import PickupRequest from '../models/PickupRequest';
import PickupItem from '../models/PickupItem';
import RateCard from '../models/RateCard';
import User from '../models/User';
import otpService from './otp.service';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { ScrapCategory, PricingMode } from '../types';

export interface IWeighedItemInput {
  category: ScrapCategory;
  weightKg: number;
}

export interface IRecordWeightsInput {
  pickupId: string;
  collectorId: string;
  mode: PricingMode;
  items: IWeighedItemInput[];
  scalePhotoUrls?: string[];
}

/**
 * Helper to fetch effective rate per kg in paise for a category in a specific zone
 */
export const getEffectiveRate = async (
  category: ScrapCategory,
  zoneId?: Types.ObjectId | null
): Promise<number> => {
  // 1. Check for zone-specific rate first
  if (zoneId) {
    const zoneRate = await RateCard.findOne({ category, zoneId });
    if (zoneRate) return zoneRate.ratePerKgPaise;
  }

  // 2. Fallback to platform-wide default rate (zoneId: null)
  const defaultRate = await RateCard.findOne({ category, zoneId: null });
  if (defaultRate) return defaultRate.ratePerKgPaise;

  throw new ApiError(400, `No active rate found for category "${category}"`);
};

/**
 * Collector enters on-site weights.
 * Recalculates exact paise totals on the server and freezes the rate snapshot per item.
 */
export const recordWeighedItems = async ({
  pickupId,
  collectorId,
  mode,
  items,
  scalePhotoUrls = [],
}: IRecordWeightsInput) => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to this collector');
  }

  // Once confirmed with OTP, weights are permanently locked
  if (pickup.customerConfirmed || pickup.status === 'confirmed' || pickup.status === 'paid') {
    throw new ApiError(400, 'This pickup is already confirmed by the customer and cannot be modified');
  }

  if (!items || items.length === 0) {
    throw new ApiError(400, 'At least one weighed item must be provided');
  }

  // 1. Remove previous items for this pickup if re-weighing before confirmation
  await PickupItem.deleteMany({ requestId: pickup._id });

  let totalWeightKg = 0;
  let totalAmountPaise = 0;
  const createdItems = [];

  // 2. Process each item and compute integer paise
  for (const item of items) {
    if (!item.weightKg || item.weightKg <= 0) {
      throw new ApiError(400, `Invalid weight for category ${item.category}`);
    }

    const categoryToUse: ScrapCategory = mode === 'mixed' ? 'mixed' : item.category;
    const ratePerKgPaise = await getEffectiveRate(categoryToUse, pickup.zoneId);

    // Calculate integer paise: Math.round avoids precision loss
    const amountPaise = Math.round(item.weightKg * ratePerKgPaise);

    totalWeightKg += item.weightKg;
    totalAmountPaise += amountPaise;

    const pickupItemDoc = await PickupItem.create({
      requestId: pickup._id,
      category: categoryToUse,
      weightKg: Number(item.weightKg.toFixed(2)),
      ratePerKgPaise, // Frozen rate snapshot!
      amountPaise,
    });

    createdItems.push(pickupItemDoc);

    // If mixed mode, only 1 combined item is created
    if (mode === 'mixed') break;
  }

  // 3. Update PickupRequest with totals and transition to 'weighed'
  pickup.pricingMode = mode;
  pickup.totalPickupWeightKg = Number(totalWeightKg.toFixed(2));
  pickup.totalAmountPaise = totalAmountPaise;
  pickup.status = 'weighed';
  if (scalePhotoUrls.length > 0) {
    pickup.scalePhotos = scalePhotoUrls;
  }

  await pickup.save();

  logger.info(
    `⚖️ Weighed pickup ${pickup._id}: ${totalWeightKg.toFixed(2)} kg = ₹${(totalAmountPaise / 100).toFixed(2)} (${mode} mode)`
  );

  // Real-Time Socket.io: Notify customer live about updated weights and amount
  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitWeightUpdated(pickup._id.toString(), pickup.customerId.toString(), {
      pickupId: pickup._id,
      mode,
      totalPickupWeightKg: pickup.totalPickupWeightKg,
      totalAmountPaise: pickup.totalAmountPaise,
      totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
      items: createdItems,
    });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event weight.updated: ${err.message}`);
  }

  return {
    pickup,
    items: createdItems,
  };
};

/**
 * Step 1 of Confirmation: Trigger 6-digit OTP to the Customer's phone
 */
export const requestCustomerConfirmationOtp = async (
  pickupId: string,
  collectorId: string
) => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  }).populate('customerId', 'phone name');

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to you');
  }

  if (pickup.status !== 'weighed') {
    throw new ApiError(400, `Cannot request confirmation OTP while status is "${pickup.status}". Must be "weighed".`);
  }

  const customer: any = pickup.customerId;
  const otpResult = await otpService.generateAndSaveOtp(customer.phone);

  return {
    phone: customer.phone,
    totalPickupWeightKg: pickup.totalPickupWeightKg,
    totalAmountPaise: pickup.totalAmountPaise,
    totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
    otp: otpResult.otp,
  };
};

/**
 * Step 2 of Confirmation: Customer enters 6-digit OTP to lock weight & amount
 */
export const confirmPickupWithOtp = async (
  pickupId: string,
  customerId: string,
  otp: string
) => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    customerId: new Types.ObjectId(customerId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found for this customer');
  }

  if (pickup.status !== 'weighed') {
    throw new ApiError(400, `Cannot confirm pickup with current status: "${pickup.status}". Must be "weighed".`);
  }

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new ApiError(404, 'Customer account not found');
  }

  // Verify OTP
  await otpService.verifyOtp(customer.phone, otp);

  // Lock the pickup amount permanently
  pickup.status = 'confirmed';
  pickup.customerConfirmed = true;
  pickup.otpVerifiedAt = new Date();

  await pickup.save();

  logger.info(`🔒 Customer confirmed pickup ${pickup._id} with OTP! Amount locked at ₹${(pickup.totalAmountPaise / 100).toFixed(2)}`);

  // Real-Time Socket.io: Notify collector that amount and weight are locked
  try {
    const sockets = (await import('../sockets')).default;
    if (pickup.collectorId) {
      sockets.emitPickupConfirmed(pickup._id.toString(), pickup.collectorId.toString(), {
        pickupId: pickup._id,
        status: 'confirmed',
        totalAmountPaise: pickup.totalAmountPaise,
        totalAmountRupees: (pickup.totalAmountPaise / 100).toFixed(2),
        customerConfirmed: true,
      });
    }
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pickup.confirmed: ${err.message}`);
  }

  return pickup;
};

/**
 * 3. Customer requests "See separate price" (only while status is weighed & mode is mixed/hybrid)
 */
export const requestSeparatePrice = async (pickupId: string, customerId: string) => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    customerId: new Types.ObjectId(customerId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found for this customer');
  }

  if (pickup.status !== 'weighed') {
    throw new ApiError(400, `Cannot request separate price. Pickup status must be "weighed", but is "${pickup.status}".`);
  }

  if (pickup.customerConfirmed) {
    throw new ApiError(400, 'Pickup amount is already confirmed and locked.');
  }

  if (pickup.pricingMode !== 'mixed' && pickup.pricingMode !== 'hybrid') {
    throw new ApiError(400, 'Separate price can only be requested when pricing mode is mixed or hybrid.');
  }

  if (!pickup.collectorId) {
    throw new ApiError(400, 'No collector assigned to this pickup.');
  }

  pickup.separateRequest = {
    requested: true,
    requestedAt: new Date(),
    status: 'pending',
    declineReason: '',
  };

  await pickup.save();

  logger.info(`🔍 Customer requested separate price for pickup ${pickup._id}`);

  // Real-Time Socket.io: Notify collector of customer request
  try {
    const sockets = (await import('../sockets')).default;
    sockets.emitSeparatePriceRequested(pickup._id.toString(), pickup.collectorId.toString(), {
      pickupId: pickup._id,
      status: 'pending',
      requestedAt: pickup.separateRequest.requestedAt,
    });
  } catch (err: any) {
    logger.warn(`Could not emit Socket event pricing.separate.requested: ${err.message}`);
  }

  return pickup;
};

/**
 * 4. Collector responds to "See separate price" request (Accept or Decline with Reason)
 */
export const respondSeparatePrice = async (
  pickupId: string,
  collectorId: string,
  action: 'accept' | 'decline',
  declineReason?: string
) => {
  const pickup = await PickupRequest.findOne({
    _id: pickupId,
    collectorId: new Types.ObjectId(collectorId),
  });

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found or not assigned to this collector');
  }

  if (pickup.status !== 'weighed') {
    throw new ApiError(400, `Cannot respond to separate price while status is "${pickup.status}". Must be "weighed".`);
  }

  if (pickup.customerConfirmed) {
    throw new ApiError(400, 'Pickup amount is already confirmed and locked.');
  }

  if (!pickup.separateRequest || pickup.separateRequest.status !== 'pending') {
    throw new ApiError(400, 'No pending separate price request found for this pickup.');
  }

  if (action === 'accept') {
    pickup.separateRequest.status = 'accepted';
    pickup.pricingMode = 'separate';
    await pickup.save();

    logger.info(`🤝 Collector accepted separate price request for pickup ${pickup._id}. Mode switched to separate.`);

    // Real-Time Socket.io: Notify customer that collector agreed to itemize
    try {
      const sockets = (await import('../sockets')).default;
      sockets.emitSeparatePriceAccepted(pickup._id.toString(), pickup.customerId.toString(), {
        pickupId: pickup._id,
        pricingMode: 'separate',
        status: 'accepted',
      });
    } catch (err: any) {
      logger.warn(`Could not emit Socket event pricing.separate.accepted: ${err.message}`);
    }
  } else if (action === 'decline') {
    if (!declineReason || !declineReason.trim()) {
      throw new ApiError(400, 'A reason is required when declining separate price request (e.g. "Only 1 kg total")');
    }

    pickup.separateRequest.status = 'declined';
    pickup.separateRequest.declineReason = declineReason.trim();
    await pickup.save();

    logger.info(`🚫 Collector declined separate price request for pickup ${pickup._id}: "${declineReason}"`);

    // Real-Time Socket.io: Notify customer that collector declined with reason
    try {
      const sockets = (await import('../sockets')).default;
      sockets.emitSeparatePriceDeclined(pickup._id.toString(), pickup.customerId.toString(), {
        pickupId: pickup._id,
        status: 'declined',
        declineReason: pickup.separateRequest.declineReason,
      });
    } catch (err: any) {
      logger.warn(`Could not emit Socket event pricing.separate.declined: ${err.message}`);
    }
  } else {
    throw new ApiError(400, 'Invalid action. Must be "accept" or "decline".');
  }

  return pickup;
};

export default {
  getEffectiveRate,
  recordWeighedItems,
  requestCustomerConfirmationOtp,
  confirmPickupWithOtp,
  requestSeparatePrice,
  respondSeparatePrice,
};
