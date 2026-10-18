// CompanyDispatch Model: Tracks scrap handover/dispatches from Store Staff to Tie-Up Recycling Companies
import mongoose, { Schema } from 'mongoose';
import { ICompanyDispatch } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

const companyDispatchSchema = new Schema<ICompanyDispatch>(
  {
    dispatchCode: {
      type: String,
      required: [true, 'Dispatch code is required'],
      unique: true,
      index: true,
      trim: true,
    },
    storeStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store staff ID is required'],
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Buyer',
      required: [true, 'Tie-up company ID is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    materialType: {
      type: String,
      enum: SCRAP_CATEGORIES,
      required: [true, 'Material type is required'],
      index: true,
    },
    weightKg: {
      type: Number,
      required: [true, 'Dispatched weight in kg is required'],
      min: [0.1, 'Weight must be at least 0.1 kg'],
    },
    vehicleNumber: {
      type: String,
      default: '',
      trim: true,
    },
    dispatchNotes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['dispatched', 'received', 'rejected'],
      default: 'dispatched',
      index: true,
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedWeightKg: {
      type: Number,
      default: null,
      min: 0,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedNotes: {
      type: String,
      default: '',
      trim: true,
    },
    receiptMessage: {
      type: String,
      default: '',
      trim: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const CompanyDispatch = mongoose.model<ICompanyDispatch>('CompanyDispatch', companyDispatchSchema);
export default CompanyDispatch;
