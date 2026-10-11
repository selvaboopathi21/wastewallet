// Buyer Model: Recyclers and specialized recovery units that receive sorted materials
import mongoose, { Schema } from 'mongoose';
import { IBuyer } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';

const buyerSchema = new Schema<IBayerType>(
  {
    name: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
    },
    acceptedMaterials: [
      {
        type: String,
        enum: SCRAP_CATEGORIES,
        required: true,
      },
    ],
    location: {
      type: String,
      default: '',
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Buyer phone number is required'],
      },
      email: {
        type: String,
        default: '',
      },
      person: {
        type: String,
        default: '',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

type IBayerType = IBuyer;

export const Buyer = mongoose.model<IBuyer>('Buyer', buyerSchema);
export default Buyer;
