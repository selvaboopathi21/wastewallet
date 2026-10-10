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

// 6. Otp Document Interface
export interface IOtp extends Document {
  _id: Types.ObjectId;
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 7. JWT Payload
export interface IAuthTokenPayload {
  id: string;
  role: UserRole;
}
