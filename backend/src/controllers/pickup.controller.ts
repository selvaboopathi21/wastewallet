// Pickup Controller: Handles HTTP requests for scrap pickups
import { Request, Response } from 'express';
import pickupService from '../services/pickup.service';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

// POST /api/v1/pickups (Customer creates scrap pickup)
export const createPickup = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!._id.toString();
  const { address, preferredTime, customerPricingPreference } = req.body;

  // Handle coordinates from either JSON body or multipart form-data string
  let coordinates = req.body.coordinates;
  if (typeof coordinates === 'string') {
    try {
      coordinates = JSON.parse(coordinates);
    } catch {
      throw new ApiError(400, 'Invalid coordinates format. Expected [longitude, latitude]');
    }
  }

  const files = (req.files as Express.Multer.File[]) || [];

  const pickup = await pickupService.createPickupRequest({
    customerId,
    address,
    coordinates,
    preferredTime,
    customerPricingPreference,
    files,
  });

  res.status(201).json({
    success: true,
    message: 'Scrap pickup request created successfully and queued for dispatch',
    data: { pickup },
  });
});

// GET /api/v1/pickups/:id
export const getPickup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await pickupService.getPickupDetails(id as string);

  res.status(200).json({
    success: true,
    message: 'Pickup details retrieved successfully',
    data,
  });
});

// GET /api/v1/pickups (List pickups for logged-in customer)
export const getMyPickups = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!._id.toString();
  const pickups = await pickupService.getCustomerPickups(customerId);

  res.status(200).json({
    success: true,
    message: 'Pickup history retrieved successfully',
    data: { pickups },
  });
});

// POST /api/v1/pickups/:id/confirm-otp (Customer inputs OTP to lock weight & amount)
export const confirmPickupOtp = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!._id.toString();
  const { id } = req.params;
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, '6-digit OTP code is required');
  }

  const pricingService = (await import('../services/pricing.service')).default;
  const confirmedPickup = await pricingService.confirmPickupWithOtp(
    id as string,
    customerId,
    otp
  );

  res.status(200).json({
    success: true,
    message: `Pickup confirmed successfully! Amount locked at ₹${(confirmedPickup.totalAmountPaise / 100).toFixed(2)}.`,
    data: { pickup: confirmedPickup },
  });
});

// POST /api/v1/pickups/:id/request-separate (Customer requests separate price breakdown)
export const requestSeparatePrice = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user!._id.toString();
  const { id } = req.params;

  const pricingService = (await import('../services/pricing.service')).default;
  const updatedPickup = await pricingService.requestSeparatePrice(id as string, customerId);

  res.status(200).json({
    success: true,
    message: 'Separate price request sent to collector',
    data: { pickup: updatedPickup },
  });
});

export default {
  createPickup,
  getPickup,
  getMyPickups,
  confirmPickupOtp,
  requestSeparatePrice,
};
