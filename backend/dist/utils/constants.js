"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_CONFIG = exports.NORMAL_CATEGORIES = exports.SPECIAL_HANDLING_CATEGORIES = exports.SCRAP_CATEGORIES = exports.LANGUAGES = exports.ROLES = void 0;
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
exports.OTP_CONFIG = {
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
};
