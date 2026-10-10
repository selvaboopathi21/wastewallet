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

export default {
  createPickup,
  getPickup,
  getMyPickups,
};
