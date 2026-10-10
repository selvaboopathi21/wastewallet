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
