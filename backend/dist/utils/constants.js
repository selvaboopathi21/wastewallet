"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_CONFIG = exports.isValidStatusTransition = exports.VALID_STATUS_TRANSITIONS = exports.PAYMENT_STATUSES = exports.PAYMENT_METHODS = exports.PRICING_PREFERENCES = exports.PRICING_MODES = exports.PICKUP_STATUSES = exports.NORMAL_CATEGORIES = exports.SPECIAL_HANDLING_CATEGORIES = exports.SCRAP_CATEGORIES = exports.LANGUAGES = exports.ROLES = void 0;
exports.ROLES = {
    CUSTOMER: 'customer',
    COLLECTOR: 'collector',
    STORE_STAFF: 'store_staff',
    BUYER: 'buyer',
    ADMIN: 'admin',
};
exports.LANGUAGES = ['en', 'ta'];
exports.SCRAP_CATEGORIES = [
    'iron',
    'plastic',
    'copper_wire',
    'paper',
    'ewaste',
    'battery',
    'other',
    'mixed',
];
// Special handling materials (e-waste, batteries) require dedicated recycling units
exports.SPECIAL_HANDLING_CATEGORIES = ['ewaste', 'battery'];
exports.NORMAL_CATEGORIES = ['iron', 'plastic', 'copper_wire', 'paper'];
exports.PICKUP_STATUSES = [
    'pending',
    'offered',
    'accepted',
    'on_the_way',
    'arrived',
    'weighed',
    'confirmed',
    'paid',
    'completed',
    'cancelled',
    'expired',
];
exports.PRICING_MODES = ['separate', 'mixed', 'hybrid'];
exports.PRICING_PREFERENCES = ['quick_mixed', 'best_price_separate', 'none'];
exports.PAYMENT_METHODS = ['cash', 'upi', 'wallet'];
exports.PAYMENT_STATUSES = ['pending', 'completed', 'failed'];
// Valid Status Transitions (Sequential order with no skipping allowed)
exports.VALID_STATUS_TRANSITIONS = {
    pending: ['offered', 'cancelled', 'expired'],
    offered: ['accepted', 'offered', 'expired', 'cancelled'], // can re-offer to next collector
    accepted: ['on_the_way', 'cancelled'],
    on_the_way: ['arrived', 'cancelled'],
    arrived: ['weighed', 'cancelled'],
    weighed: ['confirmed', 'cancelled'],
    confirmed: ['paid'],
    paid: ['completed'],
    completed: [],
    cancelled: [],
    expired: [],
};
const isValidStatusTransition = (fromStatus, toStatus) => {
    const allowed = exports.VALID_STATUS_TRANSITIONS[fromStatus];
    return allowed ? allowed.includes(toStatus) : false;
};
exports.isValidStatusTransition = isValidStatusTransition;
exports.OTP_CONFIG = {
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
};
