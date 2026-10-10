// Application constants to avoid magic strings and typos
const ROLES = {
  CUSTOMER: 'customer',
  COLLECTOR: 'collector',
  STORE_STAFF: 'store_staff',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

const LANGUAGES = ['en', 'ta'];

const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
};

module.exports = {
  ROLES,
  LANGUAGES,
  OTP_CONFIG,
};
