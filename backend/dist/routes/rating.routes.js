"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Rating Routes: Endpoints for submitting and viewing ratings
const express_1 = require("express");
const rating_controller_1 = require("../controllers/rating.controller");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
// Submit rating (authenticated customer or collector)
router.post('/', auth_1.default, rating_controller_1.submitRating);
// View ratings of a specific user
router.get('/users/:userId', auth_1.default, rating_controller_1.getUserRatings);
// View ratings of a specific pickup
router.get('/pickups/:requestId', auth_1.default, rating_controller_1.getPickupRatings);
exports.default = router;
