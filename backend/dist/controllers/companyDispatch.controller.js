"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationsRead = exports.getNotifications = exports.receiveDispatch = exports.getCompanyPortal = exports.getDispatches = exports.createDispatch = exports.getCompanies = exports.getInventory = void 0;
const companyDispatch_service_1 = __importDefault(require("../services/companyDispatch.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// GET /api/v1/company-dispatch/inventory
exports.getInventory = (0, asyncHandler_1.default)(async (_req, res) => {
    const data = await companyDispatch_service_1.default.getWarehouseInventory();
    res.status(200).json({
        success: true,
        message: 'Warehouse inventory breakdown retrieved successfully',
        data,
    });
});
// GET /api/v1/company-dispatch/companies
exports.getCompanies = (0, asyncHandler_1.default)(async (req, res) => {
    const category = req.query.category;
    const companies = await companyDispatch_service_1.default.getTieUpCompanies(category);
    res.status(200).json({
        success: true,
        message: `Found ${companies.length} tie-up recycling partner companies`,
        data: { companies },
    });
});
// POST /api/v1/company-dispatch/dispatch
exports.createDispatch = (0, asyncHandler_1.default)(async (req, res) => {
    const staffId = req.user?._id?.toString() || req.body?.staffId;
    const { companyId, materialType, weightKg, vehicleNumber, dispatchNotes, batchId } = req.body;
    if (!companyId)
        throw new ApiError_1.default(400, 'Destination companyId is required');
    if (!materialType)
        throw new ApiError_1.default(400, 'Material category is required');
    if (!weightKg || Number(weightKg) <= 0)
        throw new ApiError_1.default(400, 'Valid weightKg (> 0) is required');
    const dispatch = await companyDispatch_service_1.default.dispatchToCompany(staffId, {
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
exports.getDispatches = (0, asyncHandler_1.default)(async (req, res) => {
    const status = req.query.status;
    const companyId = req.query.companyId;
    const materialType = req.query.materialType;
    const dispatches = await companyDispatch_service_1.default.listDispatches({ status, companyId, materialType });
    res.status(200).json({
        success: true,
        message: 'Dispatches list retrieved successfully',
        data: { dispatches },
    });
});
// GET /api/v1/company-dispatch/portal/:companyId
exports.getCompanyPortal = (0, asyncHandler_1.default)(async (req, res) => {
    const { companyId } = req.params;
    const data = await companyDispatch_service_1.default.getCompanyPortal(companyId);
    res.status(200).json({
        success: true,
        message: `Company portal data retrieved for ${data.company.name}`,
        data,
    });
});
// POST /api/v1/company-dispatch/receive/:dispatchId
exports.receiveDispatch = (0, asyncHandler_1.default)(async (req, res) => {
    const { dispatchId } = req.params;
    const { receivedWeightKg, receivedNotes } = req.body;
    const result = await companyDispatch_service_1.default.receiveCompanyDispatch(dispatchId, {
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
exports.getNotifications = (0, asyncHandler_1.default)(async (_req, res) => {
    const data = await companyDispatch_service_1.default.getStaffNotifications();
    res.status(200).json({
        success: true,
        message: 'Staff notifications retrieved successfully',
        data,
    });
});
// PATCH /api/v1/company-dispatch/notifications/read
exports.markNotificationsRead = (0, asyncHandler_1.default)(async (req, res) => {
    const notificationId = req.body?.notificationId;
    const result = await companyDispatch_service_1.default.markNotificationsAsRead(notificationId);
    res.status(200).json({
        success: true,
        message: 'Notifications marked as read',
        data: result,
    });
});
exports.default = {
    getInventory: exports.getInventory,
    getCompanies: exports.getCompanies,
    createDispatch: exports.createDispatch,
    getDispatches: exports.getDispatches,
    getCompanyPortal: exports.getCompanyPortal,
    receiveDispatch: exports.receiveDispatch,
    getNotifications: exports.getNotifications,
    markNotificationsRead: exports.markNotificationsRead,
};
