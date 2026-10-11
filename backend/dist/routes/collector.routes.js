"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Collector Routes: Collector specific endpoints protected by collector role
const express_1 = require("express");
const collector_controller_1 = require("../controllers/collector.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const role_1 = require("../middleware/role");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// All collector routes require authentication and collector role
router.use(auth_1.default, (0, role_1.restrictTo)(constants_1.ROLES.COLLECTOR));
// Online / Offline toggle
router.patch('/status', collector_controller_1.toggleOnlineStatus);
// View pending 60-second offers
router.get('/offers', collector_controller_1.getMyOffers);
// View accepted active pickups
router.get('/active-jobs', collector_controller_1.getActiveJobs);
// Accept offer (Atomic conditional update)
router.post('/pickups/:id/accept', collector_controller_1.acceptPickupOffer);
// Decline offer (Moves to next collector)
router.post('/pickups/:id/decline', collector_controller_1.declinePickupOffer);
// Transition status (e.g. on_the_way, arrived)
router.patch('/pickups/:id/status', collector_controller_1.updatePickupStatus);
// Enter on-site weights (Separate or Mixed mode)
router.post('/pickups/:id/weights', collector_controller_1.recordWeights);
// Respond to "See separate price" request (Accept or Decline with reason)
router.post('/pickups/:id/respond-separate', collector_controller_1.respondSeparatePrice);
// Request 6-digit confirmation OTP to be sent to customer
router.post('/pickups/:id/request-otp', collector_controller_1.requestConfirmationOtp);
// Record cash payment
router.post('/pickups/:id/pay-cash', collector_controller_1.recordCashPayment);
// Complete pickup
router.post('/pickups/:id/complete', collector_controller_1.finishPickup);
exports.default = router;
