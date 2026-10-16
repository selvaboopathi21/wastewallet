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

// --- FRAUD DETECTION & AUDIT ALERTS ---

export interface IFraudAlert {
  type: 'high_loss_percentage' | 'excessive_mixed_mode';
  severity: 'warning' | 'critical';
  collectorId: string;
  collectorName: string;
  collectorPhone: string;
  metricValue: number;
  thresholdValue: number;
  message: string;
}

export const getFraudAlerts = async (): Promise<IFraudAlert[]> => {
  const Batch = (await import('../models/Batch')).default;
  const PickupRequest = (await import('../models/PickupRequest')).default;
  const User = (await import('../models/User')).default;

  const alerts: IFraudAlert[] = [];

  // 1. Check Loss Percentage Anomalies per Collector
  // Get all received or sorted batches with a valid loss percentage
  const batches = await Batch.find({ status: { $in: ['received', 'sorted'] }, lossPercent: { $ne: null } })
    .populate('collectorId', 'name phone');

  if (batches.length > 0) {
    // Calculate global average loss percent
    const totalLoss = batches.reduce((sum, b) => sum + (b.lossPercent || 0), 0);
    const globalAvgLoss = Number((totalLoss / batches.length).toFixed(2));

    // Group batches by collector
    const collectorLossMap = new Map<string, { totalLoss: number; count: number; collector: any }>();
    for (const b of batches) {
      if (!b.collectorId) continue;
      const cid = b.collectorId._id.toString();
      const existing = collectorLossMap.get(cid) || { totalLoss: 0, count: 0, collector: b.collectorId };
      existing.totalLoss += b.lossPercent || 0;
      existing.count += 1;
      collectorLossMap.set(cid, existing);
    }

    // Flag any collector whose average loss % exceeds acceptable threshold (20%) or exceeds global average
    for (const [cid, data] of collectorLossMap.entries()) {
      const avgLoss = Number((data.totalLoss / data.count).toFixed(2));
      const threshold = 20;

      if (avgLoss >= threshold && data.count >= 1) {
        alerts.push({
          type: 'high_loss_percentage',
          severity: avgLoss > 30 ? 'critical' : 'warning',
          collectorId: cid,
          collectorName: data.collector?.name || `Collector (${data.collector?.phone || 'Unknown'})`,
          collectorPhone: data.collector?.phone || 'N/A',
          metricValue: avgLoss,
          thresholdValue: threshold,
          message: `Collector average deposit loss of ${avgLoss}% exceeds normal loss tolerance (${threshold}%). Potential scale tampering, moisture loss, or non-recyclable contamination.`,
        });
      }
    }
  }

  // 2. Check Excessive Mixed Mode Pushing
  // When customers preferred separate price, check if collector frequently pushed them into mixed mode
  const pickupsWithPreference = await PickupRequest.find({
    status: 'completed',
    customerPricingPreference: 'best_price_separate',
  }).populate('collectorId', 'name phone');

  const collectorModeMap = new Map<string, { total: number; forcedMixed: number; collector: any }>();
  for (const p of pickupsWithPreference) {
    if (!p.collectorId) continue;
    const cid = p.collectorId._id.toString();
    const data = collectorModeMap.get(cid) || { total: 0, forcedMixed: 0, collector: p.collectorId };
    data.total += 1;
    if (p.pricingMode === 'mixed') {
      data.forcedMixed += 1;
    }
    collectorModeMap.set(cid, data);
  }

  for (const [cid, data] of collectorModeMap.entries()) {
    if (data.total >= 3) {
      const mixedPercent = Number(((data.forcedMixed / data.total) * 100).toFixed(1));
      if (mixedPercent > 65) {
        alerts.push({
          type: 'excessive_mixed_mode',
          severity: 'warning',
          collectorId: cid,
          collectorName: data.collector.name || 'Unknown',
          collectorPhone: data.collector.phone,
          metricValue: mixedPercent,
          thresholdValue: 65,
          message: `Collector converted ${mixedPercent}% of pickups to mixed mode despite customer preference for itemized pricing. Potential margin exploitation.`,
        });
      }
    }
  }

  return alerts;
};

// --- ADMIN SYSTEM & PERFORMANCE REPORTS ---

export const getAdminReports = async () => {
  const PickupRequest = (await import('../models/PickupRequest')).default;
  const PickupItem = (await import('../models/PickupItem')).default;
  const User = (await import('../models/User')).default;
  const Batch = (await import('../models/Batch')).default;

  // 1. Overall Pickup Status Summary
  const statusCounts = await PickupRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusSummary: Record<string, number> = {};
  statusCounts.forEach((s) => (statusSummary[s._id] = s.count));

  // 2. Total Weight and Volume Collected (Completed pickups)
  const totals = await PickupRequest.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalWeightKg: { $sum: '$totalPickupWeightKg' },
        totalAmountPaise: { $sum: '$totalAmountPaise' },
        completedPickups: { $sum: 1 },
      },
    },
  ]);

  const overall = totals[0] || { totalWeightKg: 0, totalAmountPaise: 0, completedPickups: 0 };

  // 3. Category-wise Scrap Totals (from itemized line items)
  const categoryTotals = await PickupItem.aggregate([
    {
      $group: {
        _id: '$category',
        totalKg: { $sum: '$weightKg' },
        totalAmountPaise: { $sum: '$amountPaise' },
        itemsCount: { $sum: 1 },
      },
    },
    { $sort: { totalKg: -1 } },
  ]);

  // 4. Collector Leaderboard
  const collectorLeaderboard = await User.find({ role: 'collector' })
    .select('name phone rating storeName isApproved isOnline')
    .sort({ 'rating.avg': -1, 'rating.count': -1 })
    .limit(10);

  // 5. Active Fraud Alerts
  const fraudAlerts = await getFraudAlerts();
  const totalPickupsCount = Object.values(statusSummary).reduce((a, b) => a + b, 0);

  return {
    totalPickups: totalPickupsCount,
    totalScrapWeightKg: Number((overall.totalWeightKg || 0).toFixed(2)),
    totalDisbursedPaise: overall.totalAmountPaise || 0,
    statusSummary,
    totals: {
      totalWeightKg: Number((overall.totalWeightKg || 0).toFixed(2)),
      totalAmountPaise: overall.totalAmountPaise || 0,
      totalAmountRupees: ((overall.totalAmountPaise || 0) / 100).toFixed(2),
      completedPickups: overall.completedPickups || 0,
    },
    categoryTotals: categoryTotals.map((c) => ({
      category: c._id,
      totalKg: Number(c.totalKg.toFixed(2)),
      totalAmountPaise: c.totalAmountPaise,
      totalAmountRupees: (c.totalAmountPaise / 100).toFixed(2),
      itemsCount: c.itemsCount,
    })),
    collectorLeaderboard,
    fraudAlerts,
  };
};

// --- USER MANAGEMENT (Approve / Block) ---

export const updateCollectorApproval = async (collectorId: string, isApproved: boolean) => {
  const User = (await import('../models/User')).default;
  const updateData: any = {
    isApproved,
    isRejected: !isApproved,
    isOnline: false,
    role: 'collector',
  };

  const collector = await User.findOneAndUpdate(
    { _id: new Types.ObjectId(collectorId) },
    updateData,
    { new: true }
  ).populate('zoneId', 'name');

  if (!collector) {
    throw new ApiError(404, 'Collector account not found');
  }

  // Real-time broadcast to collector
  try {
    const { getIO } = await import('../sockets');
    const io = getIO();
    io.to(`user:${collector._id.toString()}`).emit('collector.approval_changed', {
      isApproved: collector.isApproved,
      isRejected: collector.isRejected,
      isOnline: collector.isOnline,
      role: collector.role,
    });
  } catch (err: any) {
    // Socket broadcast non-blocking
  }

  return collector;
};

export const updateUserBlockStatus = async (userId: string, isBlocked: boolean) => {
  const User = (await import('../models/User')).default;
  const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

export default {
  createZone,
  getZones,
  updateZoneStatus,
  findZoneByCoordinates,
  setRate,
  getAllRates,
  getFraudAlerts,
  getAdminReports,
  updateCollectorApproval,
  updateUserBlockStatus,
};
