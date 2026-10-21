"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// CompanyDispatch Routes: Scrap inventory, tie-up company requirement matching, dispatching & receiving
const express_1 = require("express");
const companyDispatch_controller_1 = require("../controllers/companyDispatch.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// 1. Warehouse Inventory Breakdown: Available kg, sorted kg, dispatched kg, received kg
router.get('/inventory', auth_1.default, companyDispatch_controller_1.getInventory);
// 2. List all Tie-Up Partner Companies with accepted categories (optionally ?category=iron)
router.get('/companies', companyDispatch_controller_1.getCompanies);
// 3. Store Staff dispatches / handovers separated scrap to a specific tie-up company
router.post('/dispatch', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.STORE_STAFF, constants_1.ROLES.ADMIN, constants_1.ROLES.COLLECTOR), companyDispatch_controller_1.createDispatch);
// 4. View all scrap dispatches (with filters ?status=dispatched&companyId=...)
router.get('/dispatches', companyDispatch_controller_1.getDispatches);
// 5. Company Portal Dashboard: View incoming shipments & received history for a specific company
router.get('/portal/:companyId', companyDispatch_controller_1.getCompanyPortal);
// 6. Company confirms receipt of scrap shipment (triggers receipt message back to staff!)
router.post('/receive/:dispatchId', companyDispatch_controller_1.receiveDispatch);
// 7. Store Staff Receipt Messages & In-App Notifications
router.get('/notifications', companyDispatch_controller_1.getNotifications);
router.patch('/notifications/read', companyDispatch_controller_1.markNotificationsRead);
exports.default = router;
