// Application constants to avoid magic strings and typos
import { UserRole, Language } from '../types';

export const ROLES: Record<string, UserRole> = {
  CUSTOMER: 'customer',
  COLLECTOR: 'collector',
  STORE_STAFF: 'store_staff',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

export const LANGUAGES: Language[] = ['en', 'ta'];

export const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
};
