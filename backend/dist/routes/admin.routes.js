"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Admin Routes: Requires authentication and Admin role
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// 1. Public Viewing Endpoints (Customers & Collectors need to see current rates & zones)
router.get('/rates', admin_controller_1.getRates);
router.get('/zones', admin_controller_1.getZones);
router.get('/admin/rates', admin_controller_1.getRates);
router.get('/admin/zones', admin_controller_1.getZones);
// 2. Admin Management Endpoints (Strictly Admin only)
router.post('/admin/zones', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.createZone);
router.patch('/admin/zones/:id/status', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.updateZoneStatus);
router.post('/admin/rates', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.setRate);
router.get('/admin/reports', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.getDashboardReports);
router.get('/admin/fraud-alerts', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.getFraudAlertsList);
router.patch('/admin/collectors/:id/approve', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.approveCollector);
router.patch('/admin/users/:id/block', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.ADMIN), admin_controller_1.blockUser);
exports.default = router;
