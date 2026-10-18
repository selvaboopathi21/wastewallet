// StaffNotification Model: In-app notifications and receipt messages from tie-up companies
import mongoose, { Schema } from 'mongoose';
import { IStaffNotification } from '../types';

const staffNotificationSchema = new Schema<IStaffNotification>(
  {
    type: {
      type: String,
      enum: ['company_receipt', 'batch_deposit', 'alert'],
      default: 'company_receipt',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Buyer',
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyDispatch',
      default: null,
      index: true,
    },
    materialType: {
      type: String,
      default: '',
    },
    weightKg: {
      type: Number,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const StaffNotification = mongoose.model<IStaffNotification>('StaffNotification', staffNotificationSchema);
export default StaffNotification;
