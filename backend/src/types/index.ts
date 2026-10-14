// Centralized TypeScript Type Definitions for WasteWallet
import { Document, Types } from 'mongoose';

// 1. User Roles
export type UserRole = 'customer' | 'collector' | 'store_staff' | 'buyer' | 'admin';

// 2. Supported Languages
export type Language = 'en' | 'ta';

// 3. GeoJSON Point structure: [longitude, latitude]
export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

// 4. User Rating structure
export interface IUserRating {
  avg: number;
  count: number;
}

// 5. User Document Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  googleId?: string;
  password?: string;
  role: UserRole;
  address?: string;
  location: IGeoPoint;
  zoneId?: Types.ObjectId | null;
  rating: IUserRating;
  isBlocked: boolean;
  language: Language;
  // Collector-specific fields
  isApproved?: boolean;
  isOnline?: boolean;
  acceptanceRate?: number;
  storeName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 6. Scrap Categories
export type ScrapCategory =
  | 'iron'
  | 'plastic'
  | 'copper_wire'
  | 'paper'
  | 'ewaste'
  | 'battery'
  | 'other'
  | 'mixed';

// 7. Zone Interface (GeoJSON Polygon)
export interface IZonePolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Array of linear rings: [[[lng, lat], [lng, lat], ...]]
}

export interface IZone extends Document {
  _id: Types.ObjectId;
  name: string;
  polygon: IZonePolygon;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 8. RateCard Interface (Stored in integer Paise per Kg: 1 INR = 100 Paise)
export interface IRateCard extends Document {
  _id: Types.ObjectId;
  category: ScrapCategory;
  ratePerKgPaise: number;
  zoneId?: Types.ObjectId | null;
  updatedBy: Types.ObjectId;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 9. Otp Document Interface
export interface IOtp extends Document {
  _id: Types.ObjectId;
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 10. JWT Payload
export interface IAuthTokenPayload {
  id: string;
  role: UserRole;
}

// 11. Pickup Request Statuses (State Machine)
export type PickupStatus =
  | 'pending'
  | 'offered'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'weighed'
  | 'confirmed'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type PricingMode = 'separate' | 'mixed' | 'hybrid';
export type PricingPreference = 'quick_mixed' | 'best_price_separate' | 'none';
export type SeparateRequestStatus = 'pending' | 'accepted' | 'declined';

// 12. Pickup Request Interface
export interface IPickupRequest extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  collectorId?: Types.ObjectId | null;
  zoneId: Types.ObjectId;
  address: string;
  location: IGeoPoint;
  photos: string[];
  preferredTime?: string;
  status: PickupStatus;
  offeredTo: Types.ObjectId[];
  declinedBy?: Types.ObjectId[];
  currentOfferCollectorId?: Types.ObjectId | null;
  offerExpiresAt?: Date | null;
  customerPricingPreference: PricingPreference;
  pricingMode: PricingMode;
  separateRequest: {
    requested: boolean;
    requestedAt?: Date;
    status?: SeparateRequestStatus | null;
    declineReason?: string;
  };
  totalPickupWeightKg: number;
  totalAmountPaise: number;
  customerConfirmed: boolean;
  confirmationOtp?: string | null;
  otpVerifiedAt?: Date;
  scalePhotos: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 13. Pickup Item Interface (Weighed scrap items with rate snapshot)
export interface IPickupItem extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  category: ScrapCategory;
  weightKg: number;
  ratePerKgPaise: number;
  amountPaise: number;
  createdAt: Date;
  updatedAt: Date;
}

// 14. Payment Types and Interface
export type PaymentMethod = 'cash' | 'upi' | 'wallet';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  method: PaymentMethod;
  amountPaise: number;
  status: PaymentStatus;
  idempotencyKey: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 15. Batch Types & Interface
export type BatchStatus = 'deposited' | 'received' | 'sorted';

export interface IBatch extends Document {
  _id: Types.ObjectId;
  collectorId: Types.ObjectId;
  pickupRequestIds: Types.ObjectId[];
  qrCode: string;
  depositedWeightKg: number;
  receivedWeightKg?: number;
  lossPercent?: number;
  status: BatchStatus;
  receivedBy?: Types.ObjectId | null;
  depositedAt: Date;
  receivedAt?: Date;
  sortedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 16. Sorted Material Types & Interface
export type SortedMaterialStatus = 'sorted' | 'dispatched' | 'delivered';

export interface ISortedMaterial extends Document {
  _id: Types.ObjectId;
  batchId: Types.ObjectId;
  materialType: ScrapCategory;
  weightKg: number;
  isSpecialHandling: boolean; // e-waste & battery are special handling
  isDamaged: boolean;
  destinationBuyerId?: Types.ObjectId | null;
  status: SortedMaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 17. Buyer Interface
export interface IBuyer extends Document {
  _id: Types.ObjectId;
  name: string;
  acceptedMaterials: ScrapCategory[];
  location?: string;
  contact: {
    phone: string;
    email?: string;
    person?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 18. Rating Interface
export interface IRating extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  stars: number; // 1 to 5
  tags: string[];
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}
