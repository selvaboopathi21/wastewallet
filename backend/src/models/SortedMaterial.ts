// SortedMaterial Model: Tracks materials sorted by store staff from a batch
import mongoose, { Schema } from 'mongoose';
import { ISortedMaterial } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

const sortedMaterialSchema = new Schema<ISortedMaterial>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true,
    },
    materialType: {
      type: String,
      enum: SCRAP_CATEGORIES,
      required: [true, 'Material type is required'],
      index: true,
    },
    weightKg: {
      type: Number,
      required: [true, 'Sorted weight in kg is required'],
      min: 0,
    },
    isSpecialHandling: {
      type: Boolean,
      default: false, // Automatically set true for e-waste and battery
    },
    isDamaged: {
      type: Boolean,
      default: false,
    },
    destinationBuyerId: {
      type: Schema.Types.ObjectId,
      ref: 'Buyer',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['sorted', 'dispatched', 'delivered'],
      default: 'sorted',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SortedMaterial = mongoose.model<ISortedMaterial>('SortedMaterial', sortedMaterialSchema);
export default SortedMaterial;
