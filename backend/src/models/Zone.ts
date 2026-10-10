// Zone Model: Represents a geographical collection territory using GeoJSON Polygon
import mongoose, { Schema } from 'mongoose';
import { IZone } from '../types';

const zoneSchema = new Schema<IZone>(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      unique: true,
      trim: true,
    },
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      // Array of coordinate rings: [[[lng, lat], [lng, lat], ..., [lng, lat]]]
      // First and last coordinates MUST be the same to close the ring
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere spatial index: Enables $geoIntersects queries to detect user zones
zoneSchema.index({ polygon: '2dsphere' });

export const Zone = mongoose.model<IZone>('Zone', zoneSchema);
export default Zone;
