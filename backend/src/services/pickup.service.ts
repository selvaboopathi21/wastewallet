// Pickup Service: Business logic for scrap collection requests and zone detection
import PickupRequest from '../models/PickupRequest';
import PickupItem from '../models/PickupItem';
import adminService from './admin.service';
import { uploadImageBuffer } from '../config/cloudinary';
import ApiError from '../utils/ApiError';
import { IPickupRequest, PricingPreference } from '../types';

export interface ICreatePickupInput {
  customerId: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  preferredTime?: string;
  customerPricingPreference?: PricingPreference;
  files?: Express.Multer.File[];
  zoneId?: string;
}

/**
 * Creates a new customer scrap pickup request with automatic zone detection
 */
export const createPickupRequest = async ({
  customerId,
  address,
  coordinates,
  preferredTime = 'anytime',
  customerPricingPreference = 'none',
  files = [],
  zoneId,
}: ICreatePickupInput): Promise<IPickupRequest> => {
  // 1. Validate address and GPS coordinates
  if (!address || !address.trim()) {
    throw new ApiError(400, 'Pickup address is required');
  }

  if (
    !coordinates ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number'
  ) {
    throw new ApiError(400, 'Valid GPS coordinates [longitude, latitude] are required');
  }

  const [lng, lat] = coordinates;

  // 2. Automatic Zone Detection: Check coordinates, fallback to provided zoneId, or active zone
  let detectedZone = await adminService.findZoneByCoordinates(lng, lat);
  if (!detectedZone && zoneId) {
    const Zone = (await import('../models/Zone')).default;
    detectedZone = await Zone.findById(zoneId);
  }
  if (!detectedZone) {
    const Zone = (await import('../models/Zone')).default;
    detectedZone = await Zone.findOne({ isActive: true });
  }
  if (!detectedZone) {
    throw new ApiError(
      400,
      'Sorry, we do not currently service scrap pickups at this location. Please check our supported collection zones.'
    );
  }

  // 3. Upload photos to Cloudinary (or dev fallback)
  const photoUrls: string[] = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadImageBuffer(file.buffer, 'wastewallet/pickups');
      photoUrls.push(url);
    }
  }

  // 4. Normalize and map customer pricing preference
  let normalizedPref: string = customerPricingPreference || 'none';
  if (normalizedPref === 'separate') normalizedPref = 'best_price_separate';
  if (normalizedPref === 'mixed') normalizedPref = 'quick_mixed';

  const initialPricingMode =
    normalizedPref === 'quick_mixed' ? 'mixed' : 'separate';

  // 5. Create Pickup Request in MongoDB
  const pickup = await PickupRequest.create({
    customerId,
    zoneId: detectedZone._id,
    address: address.trim(),
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    photos: photoUrls,
    preferredTime,
    customerPricingPreference: normalizedPref,
    pricingMode: initialPricingMode,
    status: 'pending',
    offeredTo: [],
    scalePhotos: [],
  });

  // 6. Automatically dispatch to best online collector in zone
  const dispatchService = (await import('./dispatch.service')).default;
  const dispatchedPickup = await dispatchService.dispatchPickupRequest(pickup._id);

  return dispatchedPickup || pickup;
};

/**
 * Retrieve single pickup request with its line items
 */
export const getPickupDetails = async (pickupId: string) => {
  const pickup = await PickupRequest.findById(pickupId)
    .populate('customerId', 'name phone')
    .populate('collectorId', 'name phone storeName rating')
    .populate('zoneId', 'name');

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  const items = await PickupItem.find({ requestId: pickup._id });

  return {
    pickup,
    items,
  };
};

/**
 * Get all pickup requests for a specific customer
 */
export const getCustomerPickups = async (customerId: string) => {
  return await PickupRequest.find({ customerId })
    .populate('zoneId', 'name')
    .populate('collectorId', 'name phone')
    .sort({ createdAt: -1 });
};

/**
 * Cancels a pickup request (by customer or admin)
 */
export const cancelPickupRequest = async (pickupId: string, userId: string, userRole: string) => {
  const pickup = await PickupRequest.findById(pickupId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  // Ensure only the customer who booked it or an admin can cancel
  if (userRole !== 'admin' && pickup.customerId.toString() !== userId) {
    throw new ApiError(403, 'You do not have permission to cancel this pickup');
  }

  // Prevent cancellation if already arrived, weighed, confirmed, or completed
  if (['arrived', 'weighed', 'confirmed', 'paid', 'completed'].includes(pickup.status)) {
    throw new ApiError(400, `Cannot cancel pickup once collector has arrived (Current status: ${pickup.status})`);
  }

  const previousStatus = pickup.status;
  const assignedCollectorId = pickup.collectorId ? pickup.collectorId.toString() : null;
  const currentOfferCollectorId = pickup.currentOfferCollectorId ? pickup.currentOfferCollectorId.toString() : null;

  pickup.status = 'cancelled';
  pickup.currentOfferCollectorId = null;
  pickup.offerExpiresAt = null;
  await pickup.save();

  try {
    const sockets = (await import('../sockets')).default;
    const { getIO } = await import('../sockets');
    const io = getIO();
    const payload = {
      pickupId: pickup._id.toString(),
      requestId: pickup._id.toString(),
      newStatus: 'cancelled',
      status: 'cancelled',
      previousStatus,
    };

    // 1. Emit to pickup room
    sockets.emitStatusChanged(pickup._id.toString(), payload);
    io.to(`pickup:${pickup._id.toString()}`).emit('pickup.cancelled', payload);

    // 2. Broadcast globally so all collectors viewing incoming offers drop it immediately
    io.emit('pickup.cancelled', payload);
    io.emit('pickup.status.changed', payload);

    // 3. Emit directly to the assigned or targeted collector's private user room
    if (assignedCollectorId) {
      io.to(`user:${assignedCollectorId}`).emit('pickup.cancelled', payload);
      io.to(`user:${assignedCollectorId}`).emit('pickup.status.changed', payload);
    }
    if (currentOfferCollectorId && currentOfferCollectorId !== assignedCollectorId) {
      io.to(`user:${currentOfferCollectorId}`).emit('pickup.cancelled', payload);
      io.to(`user:${currentOfferCollectorId}`).emit('pickup.status.changed', payload);
    }
  } catch (err: any) {
    // Sockets emission non-blocking
  }

  return pickup;
};

export default {
  createPickupRequest,
  getPickupDetails,
  getCustomerPickups,
  cancelPickupRequest,
};
