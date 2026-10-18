// CompanyDispatch Controller: Handles HTTP requests for scrap inventory, tie-up companies, dispatches, reception & staff messages
import { Request, Response } from 'express';
import companyDispatchService from '../services/companyDispatch.service';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

// GET /api/v1/company-dispatch/inventory
export const getInventory = asyncHandler(async (_req: Request, res: Response) => {
  const data = await companyDispatchService.getWarehouseInventory();

  res.status(200).json({
    success: true,
    message: 'Warehouse inventory breakdown retrieved successfully',
    data,
  });
});

// GET /api/v1/company-dispatch/companies
export const getCompanies = asyncHandler(async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const companies = await companyDispatchService.getTieUpCompanies(category);

  res.status(200).json({
    success: true,
    message: `Found ${companies.length} tie-up recycling partner companies`,
    data: { companies },
  });
});

// POST /api/v1/company-dispatch/dispatch
export const createDispatch = asyncHandler(async (req: Request, res: Response) => {
  const staffId = req.user?._id?.toString() || req.body?.staffId;
  const { companyId, materialType, weightKg, vehicleNumber, dispatchNotes, batchId } = req.body;

  if (!companyId) throw new ApiError(400, 'Destination companyId is required');
  if (!materialType) throw new ApiError(400, 'Material category is required');
  if (!weightKg || Number(weightKg) <= 0) throw new ApiError(400, 'Valid weightKg (> 0) is required');

  const dispatch = await companyDispatchService.dispatchToCompany(staffId, {
    companyId,
    materialType,
    weightKg: Number(weightKg),
    vehicleNumber,
    dispatchNotes,
    batchId,
  });

  res.status(201).json({
    success: true,
    message: `Successfully dispatched ${weightKg} kg ${materialType} to ${dispatch.companyName}`,
    data: { dispatch },
  });
});

// GET /api/v1/company-dispatch/dispatches
export const getDispatches = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const companyId = req.query.companyId as string | undefined;
  const materialType = req.query.materialType as string | undefined;

  const dispatches = await companyDispatchService.listDispatches({ status, companyId, materialType });

  res.status(200).json({
    success: true,
    message: 'Dispatches list retrieved successfully',
    data: { dispatches },
  });
});

// GET /api/v1/company-dispatch/portal/:companyId
export const getCompanyPortal = asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const data = await companyDispatchService.getCompanyPortal(companyId as string);

  res.status(200).json({
    success: true,
    message: `Company portal data retrieved for ${data.company.name}`,
    data,
  });
});

// POST /api/v1/company-dispatch/receive/:dispatchId
export const receiveDispatch = asyncHandler(async (req: Request, res: Response) => {
  const { dispatchId } = req.params;
  const { receivedWeightKg, receivedNotes } = req.body;

  const result = await companyDispatchService.receiveCompanyDispatch(dispatchId as string, {
    receivedWeightKg: receivedWeightKg ? Number(receivedWeightKg) : undefined,
    receivedNotes,
  });

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

// GET /api/v1/company-dispatch/notifications
export const getNotifications = asyncHandler(async (_req: Request, res: Response) => {
  const data = await companyDispatchService.getStaffNotifications();

  res.status(200).json({
    success: true,
    message: 'Staff notifications retrieved successfully',
    data,
  });
});

// PATCH /api/v1/company-dispatch/notifications/read
export const markNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const notificationId = req.body?.notificationId as string | undefined;
  const result = await companyDispatchService.markNotificationsAsRead(notificationId);

  res.status(200).json({
    success: true,
    message: 'Notifications marked as read',
    data: result,
  });
});

export default {
  getInventory,
  getCompanies,
  createDispatch,
  getDispatches,
  getCompanyPortal,
  receiveDispatch,
  getNotifications,
  markNotificationsRead,
};
