// Application constants to avoid magic strings and typos
import { UserRole, Language } from '../types';

export const ROLES: Record<string, UserRole> = {
  CUSTOMER: 'customer',
  COLLECTOR: 'collector',
  STORE_STAFF: 'store_staff',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

export const LANGUAGES = ['en', 'ta'] as const;

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

export const PICKUP_STATUSES = [
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
] as const;

export const PRICING_MODES = ['separate', 'mixed', 'hybrid'] as const;
export const PRICING_PREFERENCES = ['quick_mixed', 'best_price_separate', 'none'] as const;

export const PAYMENT_METHODS = ['cash', 'upi', 'wallet'] as const;
export const PAYMENT_STATUSES = ['pending', 'completed', 'failed'] as const;

// Valid Status Transitions (Sequential order with no skipping allowed)
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
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

export const isValidStatusTransition = (fromStatus: string, toStatus: string): boolean => {
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
};

export const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
};
