"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPickupRatings = exports.getUserRatings = exports.submitRating = void 0;
const rating_service_1 = __importDefault(require("../services/rating.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// POST /api/v1/ratings (Submit rating for a completed pickup)
exports.submitRating = (0, asyncHandler_1.default)(async (req, res) => {
    const fromUserId = req.user._id.toString();
    const { requestId, stars, tags, comment } = req.body;
    if (!requestId) {
        throw new ApiError_1.default(400, 'requestId is required');
    }
    if (stars === undefined || stars === null) {
        throw new ApiError_1.default(400, 'stars (1 to 5) is required');
    }
    const result = await rating_service_1.default.submitRating({
        requestId,
        fromUserId,
        stars: Number(stars),
        tags,
        comment,
    });
    res.status(201).json({
        success: true,
        message: `Rating of ${stars} stars submitted successfully`,
        data: result,
    });
});
// GET /api/v1/ratings/users/:userId (View all ratings received by a user)
exports.getUserRatings = (0, asyncHandler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const ratings = await rating_service_1.default.getUserRatings(userId);
    res.status(200).json({
        success: true,
        message: 'User ratings retrieved successfully',
        data: { ratings },
    });
});
// GET /api/v1/ratings/pickups/:requestId (View ratings for a specific pickup)
exports.getPickupRatings = (0, asyncHandler_1.default)(async (req, res) => {
    const { requestId } = req.params;
    const ratings = await rating_service_1.default.getPickupRatings(requestId);
    res.status(200).json({
        success: true,
        message: 'Pickup ratings retrieved successfully',
        data: { ratings },
    });
});
exports.default = {
    submitRating: exports.submitRating,
    getUserRatings: exports.getUserRatings,
    getPickupRatings: exports.getPickupRatings,
};
