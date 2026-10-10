// Payment Model: Records scrap payment transactions idempotently
import mongoose, { Schema } from 'mongoose';
import { IPayment } from '../types';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../utils/constants';

const paymentSchema = new Schema<IPayment>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'PickupRequest',
      required: [true, 'Pickup Request ID is required'],
      unique: true, // Only one payment record per pickup request!
      index: true,
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cash',
      required: true,
    },
    amountPaise: {
      type: Number,
      required: [true, 'Payment amount in paise is required'],
      min: [0, 'Amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'completed',
    },
    // Prevents double-processing of payments
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
