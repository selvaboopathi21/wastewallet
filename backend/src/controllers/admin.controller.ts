// Admin Controller: Reads HTTP requests, invokes admin.service, and returns responses
import { Request, Response } from 'express';
import adminService from '../services/admin.service';
import asyncHandler from '../utils/asyncHandler';

// GET /api/v1/zones (Public)
export const getZones = asyncHandler(async (req: Request, res: Response) => {
  const onlyActive = req.query.active === 'true';
  const zones = await adminService.getZones(onlyActive);

  res.status(200).json({
    success: true,
    message: 'Zones retrieved successfully',
    data: { zones },
  });
});

// POST /api/v1/admin/zones (Admin Only)
export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const { name, coordinates } = req.body;
  const zone = await adminService.createZone({ name, coordinates });

  res.status(201).json({
    success: true,
    message: `Zone "${zone.name}" created successfully`,
    data: { zone },
  });
});

// PATCH /api/v1/admin/zones/:id/status (Admin Only)
export const updateZoneStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const zone = await adminService.updateZoneStatus(id, isActive);

  res.status(200).json({
    success: true,
    message: `Zone status updated to ${isActive ? 'active' : 'inactive'}`,
    data: { zone },
  });
});

// GET /api/v1/rates (Public)
export const getRates = asyncHandler(async (req: Request, res: Response) => {
  const zoneId = req.query.zoneId as string | undefined;
  const rates = await adminService.getAllRates(zoneId);

  res.status(200).json({
    success: true,
    message: 'Rate card retrieved successfully',
    data: {
      rates: rates.map((r) => ({
        category: r.category,
        ratePerKgPaise: r.ratePerKgPaise,
        ratePerKgRupees: (r.ratePerKgPaise / 100).toFixed(2), // Friendly preview in INR
        zoneId: r.zoneId,
        effectiveFrom: r.effectiveFrom,
      })),
    },
  });
});

// POST /api/v1/admin/rates (Admin Only)
export const setRate = asyncHandler(async (req: Request, res: Response) => {
  const { category, ratePerKgPaise, zoneId } = req.body;
  const adminUserId = req.user!._id.toString();

  const rateDoc = await adminService.setRate({
    category,
    ratePerKgPaise,
    zoneId,
    adminUserId,
  });

  res.status(200).json({
    success: true,
    message: `Rate for "${rateDoc.category}" updated to ₹${(rateDoc.ratePerKgPaise / 100).toFixed(2)}/kg`,
    data: {
      rate: {
        category: rateDoc.category,
        ratePerKgPaise: rateDoc.ratePerKgPaise,
        ratePerKgRupees: (rateDoc.ratePerKgPaise / 100).toFixed(2),
        zoneId: rateDoc.zoneId,
      },
    },
  });
});

export default {
  getZones,
  createZone,
  updateZoneStatus,
  getRates,
  setRate,
};
