// Application constants to avoid magic strings and typos
import { UserRole, Language } from '../types';

export const ROLES: Record<string, UserRole> = {
  CUSTOMER: 'customer',
  COLLECTOR: 'collector',
  STORE_STAFF: 'store_staff',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

export const SCRAP_CATEGORIES = [
  'iron',
  'plastic',
  'copper_wire',
  'paper',
  'ewaste',
  'battery',
  'other',
  'mixed',
] as const;

// Special handling materials (e-waste, batteries) require dedicated recycling units
export const SPECIAL_HANDLING_CATEGORIES = ['ewaste', 'battery'] as const;

export const NORMAL_CATEGORIES = ['iron', 'plastic', 'copper_wire', 'paper'] as const;

export const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
};
