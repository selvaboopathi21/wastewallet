"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUser = exports.getCollectorsList = exports.approveCollector = exports.getFraudAlertsList = exports.getDashboardReports = exports.setRate = exports.getRates = exports.updateZoneStatus = exports.createZone = exports.getZones = void 0;
const admin_service_1 = __importDefault(require("../services/admin.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
// GET /api/v1/zones (Public)
exports.getZones = (0, asyncHandler_1.default)(async (req, res) => {
    const onlyActive = req.query.active === 'true';
    const zones = await admin_service_1.default.getZones(onlyActive);
    res.status(200).json({
        success: true,
        message: 'Zones retrieved successfully',
        data: { zones },
    });
});
// POST /api/v1/admin/zones (Admin Only)
exports.createZone = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, coordinates } = req.body;
    const zone = await admin_service_1.default.createZone({ name, coordinates });
    res.status(201).json({
        success: true,
        message: `Zone "${zone.name}" created successfully`,
        data: { zone },
    });
});
// PATCH /api/v1/admin/zones/:id/status (Admin Only)
exports.updateZoneStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const zone = await admin_service_1.default.updateZoneStatus(id, isActive);
    res.status(200).json({
        success: true,
        message: `Zone status updated to ${isActive ? 'active' : 'inactive'}`,
        data: { zone },
    });
});
// GET /api/v1/rates (Public)
exports.getRates = (0, asyncHandler_1.default)(async (req, res) => {
    const zoneId = req.query.zoneId;
    const rates = await admin_service_1.default.getAllRates(zoneId);
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
exports.setRate = (0, asyncHandler_1.default)(async (req, res) => {
    const { category, ratePerKgPaise, zoneId } = req.body;
    const adminUserId = req.user._id.toString();
    const rateDoc = await admin_service_1.default.setRate({
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
exports.getDashboardReports = (0, asyncHandler_1.default)(async (req, res) => {
    const reports = await admin_service_1.default.getAdminReports();
    res.status(200).json({
        success: true,
        message: 'Admin dashboard reports retrieved successfully',
        data: reports,
    });
});
// GET /api/v1/admin/fraud-alerts (Fraud & Anomaly Alerts)
exports.getFraudAlertsList = (0, asyncHandler_1.default)(async (req, res) => {
    const alerts = await admin_service_1.default.getFraudAlerts();
    res.status(200).json({
        success: true,
        message: `Retrieved ${alerts.length} active fraud alerts`,
        data: { alerts },
    });
});
// PATCH /api/v1/admin/collectors/:id/approve (Admin approves/revokes collector)
exports.approveCollector = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { isApproved } = req.body;
    const collector = await admin_service_1.default.updateCollectorApproval(id, Boolean(isApproved));
    res.status(200).json({
        success: true,
        message: isApproved
            ? `Collector ${collector.name || collector.phone} has been ACCEPTED as an approved Collector partner.`
            : `Application for ${collector.name || collector.phone} has been REJECTED. Partner access locked.`,
        data: { collector },
    });
});
// GET /api/v1/admin/collectors (List all collectors and customers with approval status)
exports.getCollectorsList = (0, asyncHandler_1.default)(async (req, res) => {
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const role = req.query.role;
    const query = role && role !== 'all' ? { role } : { role: { $in: ['collector', 'customer'] } };
    const collectors = await User.find(query)
        .select('name phone email address zoneId rating storeName isApproved isRejected isOnline role createdAt')
        .populate('zoneId', 'name')
        .sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        message: `Retrieved ${collectors.length} users`,
        data: { collectors },
    });
});
// PATCH /api/v1/admin/users/:id/block (Admin blocks/unblocks user)
exports.blockUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { isBlocked } = req.body;
    const user = await admin_service_1.default.updateUserBlockStatus(id, Boolean(isBlocked));
    res.status(200).json({
        success: true,
        message: `User ${user.name || user.phone} blocked status updated to ${isBlocked}`,
        data: { user },
    });
});
exports.default = {
    getZones: exports.getZones,
    getRates: exports.getRates,
    setRate: exports.setRate,
    createZone: exports.createZone,
    updateZoneStatus: exports.updateZoneStatus,
    getDashboardReports: exports.getDashboardReports,
    getFraudAlertsList: exports.getFraudAlertsList,
    getCollectorsList: exports.getCollectorsList,
    approveCollector: exports.approveCollector,
    blockUser: exports.blockUser,
};
