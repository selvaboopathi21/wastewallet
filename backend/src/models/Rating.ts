// Rating Model: Post-pickup ratings and reviews
import mongoose, { Schema } from 'mongoose';
import { IRating } from '../types';

const ratingSchema = new Schema<IRating>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'PickupRequest',
      required: [true, 'Pickup Request ID is required'],
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Rater user ID is required'],
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target user ID is required'],
      index: true,
    },
    stars: {
      type: Number,
      required: [true, 'Star rating is required'],
      min: [1, 'Minimum rating is 1 star'],
      max: [5, 'Maximum rating is 5 stars'],
    },
    tags: {
      type: [String],
      default: [],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce rule: each user can only rate once per pickup request
ratingSchema.index({ requestId: 1, fromUserId: 1 }, { unique: true });

export const Rating = mongoose.model<IRating>('Rating', ratingSchema);
export default Rating;
