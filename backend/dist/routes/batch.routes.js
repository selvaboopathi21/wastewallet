"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Batch Routes: Collector deposit and Store Staff sorting endpoints
const express_1 = require("express");
const batch_controller_1 = require("../controllers/batch.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// 1. Collector deposits completed pickups as a new Batch (QR Code)
router.post('/', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.COLLECTOR), batch_controller_1.createBatch);
// 2. View batches (Collector sees their own, Store Staff & Admin see all)
router.get('/', auth_1.default, batch_controller_1.listBatches);
// 3. Store Staff scans QR and records received weight (calculates loss %)
router.post('/:qrCode/receive', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.STORE_STAFF, constants_1.ROLES.ADMIN), batch_controller_1.receiveBatch);
// 4. Store Staff sorts materials and system automatically routes to Buyers
router.post('/:id/sort', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.STORE_STAFF, constants_1.ROLES.ADMIN), batch_controller_1.sortBatch);
// 5. Traceability: View specific batch details, line items, and buyers
router.get('/:id', auth_1.default, batch_controller_1.getBatch);
exports.default = router;
