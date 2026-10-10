// PickupItem Model: Individual weighed scrap items with frozen rate snapshot
import mongoose, { Schema } from 'mongoose';
import { IPickupItem } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

const pickupItemSchema = new Schema<IPickupItem>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'PickupRequest',
      required: [true, 'Pickup Request ID is required'],
      index: true,
    },
    category: {
      type: String,
      enum: SCRAP_CATEGORIES,
      required: [true, 'Scrap category is required'],
    },
    weightKg: {
      type: Number,
      required: [true, 'Weight in kg is required'],
      min: [0.01, 'Weight must be greater than 0'],
    },
    // CRITICAL: Frozen snapshot of the rate at pickup time in paise
    // If admin changes the rate card tomorrow, this pickup record remains unchanged!
    ratePerKgPaise: {
      type: Number,
      required: [true, 'Snapshot rate per kg in paise is required'],
      min: [0, 'Rate cannot be negative'],
    },
    amountPaise: {
      type: Number,
      required: [true, 'Total amount in paise is required'],
      min: [0, 'Amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export const PickupItem = mongoose.model<IPickupItem>('PickupItem', pickupItemSchema);
export default PickupItem;
