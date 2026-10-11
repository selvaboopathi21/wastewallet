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

  // 2. Automatic Zone Detection: Check which collection zone covers this location
  const detectedZone = await adminService.findZoneByCoordinates(lng, lat);
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
  let normalizedPref = customerPricingPreference || 'none';
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

export default {
  createPickupRequest,
  getPickupDetails,
  getCustomerPickups,
};
