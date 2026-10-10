// RateCard Model: Category-wise rates stored in integer Paise per Kg
import mongoose, { Schema } from 'mongoose';
import { IRateCard } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

const rateCardSchema = new Schema<IRateCard>(
  {
    category: {
      type: String,
      enum: SCRAP_CATEGORIES,
      required: [true, 'Scrap category is required'],
    },
    // IMPORTANT: Stored strictly as integer Paise (1 INR = 100 Paise) to avoid floating-point math issues
    ratePerKgPaise: {
      type: Number,
      required: [true, 'Rate in paise per kg is required'],
      min: [0, 'Rate cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    // Optional zoneId: if null, this acts as the platform-wide default rate
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: Only one active rate per category per zone
rateCardSchema.index({ category: 1, zoneId: 1 }, { unique: true });

export const RateCard = mongoose.model<IRateCard>('RateCard', rateCardSchema);
export default RateCard;
