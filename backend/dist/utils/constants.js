"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_CONFIG = exports.LANGUAGES = exports.ROLES = void 0;
exports.ROLES = {
    CUSTOMER: 'customer',
    COLLECTOR: 'collector',
    STORE_STAFF: 'store_staff',
    BUYER: 'buyer',
    ADMIN: 'admin',
};
exports.LANGUAGES = ['en', 'ta'];
exports.OTP_CONFIG = {
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
};
