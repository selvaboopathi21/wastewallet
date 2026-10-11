"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Pickup Routes: Endpoints for customer scrap pickup creation and retrieval
const express_1 = require("express");
const pickup_controller_1 = require("../controllers/pickup.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const upload_1 = require("../middleware/upload");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Customer creates a new scrap pickup (with optional up to 5 photos)
router.post('/', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.CUSTOMER), upload_1.uploadPhotos.array('photos', 5), pickup_controller_1.createPickup);
// Customer views their pickup history
router.get('/', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.CUSTOMER), pickup_controller_1.getMyPickups);
// Customer requests itemized separate price (only in mixed mode)
router.post('/:id/request-separate', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.CUSTOMER), pickup_controller_1.requestSeparatePrice);
// Customer confirms on-site weights and amount with 6-digit OTP
router.post('/:id/confirm-otp', auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.CUSTOMER), pickup_controller_1.confirmPickupOtp);
// View specific pickup details (Customer, Collector, or Admin)
router.get('/:id', auth_1.default, pickup_controller_1.getPickup);
exports.default = router;
