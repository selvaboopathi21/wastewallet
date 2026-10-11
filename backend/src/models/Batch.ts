// Batch Model: Collector deposits daily pickups at the store using a QR code
import mongoose, { Schema } from 'mongoose';
import { IBatch } from '../types';

const batchSchema = new Schema<IBatch>(
  {
    collectorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Collector ID is required'],
      index: true,
    },
    pickupRequestIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PickupRequest',
        required: true,
      },
    ],
    qrCode: {
      type: String,
      required: [true, 'Batch QR code is required'],
      unique: true,
      index: true,
    },
    depositedWeightKg: {
      type: Number,
      required: [true, 'Deposited weight is required'],
      min: 0,
    },
    receivedWeightKg: {
      type: Number,
      default: null,
      min: 0,
    },
    lossPercent: {
      type: Number,
      default: null, // Computed as ((deposited - received) / deposited) * 100
    },
    status: {
      type: String,
      enum: ['deposited', 'received', 'sorted'],
      default: 'deposited',
      index: true,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    depositedAt: {
      type: Date,
      default: Date.now,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    sortedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Batch = mongoose.model<IBatch>('Batch', batchSchema);
export default Batch;
