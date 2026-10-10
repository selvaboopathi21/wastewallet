// Admin Service: Business logic for Zones and Rate Cards
import { Types } from 'mongoose';
import Zone from '../models/Zone';
import RateCard from '../models/RateCard';
import ApiError from '../utils/ApiError';
import { ScrapCategory, IZone, IRateCard } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

// --- ZONE MANAGEMENT ---

export interface ICreateZoneInput {
  name: string;
  coordinates: number[][][]; // GeoJSON polygon rings
}

export const createZone = async ({ name, coordinates }: ICreateZoneInput): Promise<IZone> => {
  if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    throw new ApiError(400, 'Zone name and valid polygon coordinates are required');
  }

  // GeoJSON Polygon rule: The first and last coordinate in the ring MUST match
  const firstRing = coordinates[0];
  if (firstRing.length < 4) {
    throw new ApiError(400, 'A polygon ring must have at least 4 coordinates');
  }

  const firstPt = firstRing[0];
  const lastPt = firstRing[firstRing.length - 1];
  if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
    // Automatically close the ring if caller omitted the repeat point
    firstRing.push([...firstPt]);
  }

  const existing = await Zone.findOne({ name });
  if (existing) {
    throw new ApiError(409, `A zone named "${name}" already exists`);
  }

  const zone = await Zone.create({
    name,
    polygon: {
      type: 'Polygon',
      coordinates,
    },
    isActive: true,
  });

  return zone;
};

export const getZones = async (onlyActive = false): Promise<IZone[]> => {
  const filter = onlyActive ? { isActive: true } : {};
  return await Zone.find(filter).sort({ name: 1 });
};

export const updateZoneStatus = async (zoneId: string, isActive: boolean): Promise<IZone> => {
  const zone = await Zone.findByIdAndUpdate(zoneId, { isActive }, { new: true });
  if (!zone) {
    throw new ApiError(404, 'Zone not found');
  }
  return zone;
};

/**
 * Finds which geographical Zone a given customer [longitude, latitude] point is inside
 * Uses MongoDB 2dsphere $geoIntersects operator.
 */
export const findZoneByCoordinates = async (lng: number, lat: number): Promise<IZone | null> => {
  const zone = await Zone.findOne({
    isActive: true,
    polygon: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      },
    },
  });

  return zone;
};

// --- RATE CARD MANAGEMENT ---

export interface ISetRateInput {
  category: ScrapCategory;
  ratePerKgPaise: number;
  zoneId?: string | null;
  adminUserId: string;
}

export const setRate = async ({
  category,
  ratePerKgPaise,
  zoneId = null,
  adminUserId,
}: ISetRateInput): Promise<IRateCard> => {
  if (!SCRAP_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid category. Must be one of: ${SCRAP_CATEGORIES.join(', ')}`);
  }

  if (typeof ratePerKgPaise !== 'number' || ratePerKgPaise < 0 || !Number.isInteger(ratePerKgPaise)) {
    throw new ApiError(400, 'Rate must be a positive integer in paise (e.g. 3200 for ₹32/kg)');
  }

  const targetZoneId = zoneId ? new Types.ObjectId(zoneId) : null;

  const rateDoc = await RateCard.findOneAndUpdate(
    { category, zoneId: targetZoneId },
    {
      category,
      ratePerKgPaise,
      zoneId: targetZoneId,
      updatedBy: new Types.ObjectId(adminUserId),
      effectiveFrom: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return rateDoc;
};

export const getAllRates = async (zoneId?: string): Promise<IRateCard[]> => {
  const targetZoneId = zoneId ? new Types.ObjectId(zoneId) : null;
  return await RateCard.find({ zoneId: targetZoneId }).sort({ category: 1 });
};

export default {
  createZone,
  getZones,
  updateZoneStatus,
  findZoneByCoordinates,
  setRate,
  getAllRates,
};
