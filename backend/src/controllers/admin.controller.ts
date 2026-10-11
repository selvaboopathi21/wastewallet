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
  const zone = await adminService.updateZoneStatus(id as string, isActive);

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

// GET /api/v1/admin/reports (Admin Dashboard Summary)
export const getDashboardReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await adminService.getAdminReports();

  res.status(200).json({
    success: true,
    message: 'Admin dashboard reports retrieved successfully',
    data: reports,
  });
});

// GET /api/v1/admin/fraud-alerts (Fraud & Anomaly Alerts)
export const getFraudAlertsList = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await adminService.getFraudAlerts();

  res.status(200).json({
    success: true,
    message: `Retrieved ${alerts.length} active fraud alerts`,
    data: { alerts },
  });
});

// PATCH /api/v1/admin/collectors/:id/approve (Admin approves/revokes collector)
export const approveCollector = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isApproved } = req.body;

  const collector = await adminService.updateCollectorApproval(id as string, Boolean(isApproved));

  res.status(200).json({
    success: true,
    message: `Collector ${collector.name || collector.phone} approval updated to ${isApproved}`,
    data: { collector },
  });
});

// PATCH /api/v1/admin/users/:id/block (Admin blocks/unblocks user)
export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isBlocked } = req.body;

  const user = await adminService.updateUserBlockStatus(id as string, Boolean(isBlocked));

  res.status(200).json({
    success: true,
    message: `User ${user.name || user.phone} blocked status updated to ${isBlocked}`,
    data: { user },
  });
});

export default {
  getZones,
  createZone,
  updateZoneStatus,
  getRates,
  setRate,
  getDashboardReports,
  getFraudAlertsList,
  approveCollector,
  blockUser,
};
