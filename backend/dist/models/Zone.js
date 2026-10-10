"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zone = void 0;
// Zone Model: Represents a geographical collection territory using GeoJSON Polygon
const mongoose_1 = __importStar(require("mongoose"));
const zoneSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
// 2dsphere spatial index: Enables $geoIntersects queries to detect user zones
zoneSchema.index({ polygon: '2dsphere' });
exports.Zone = mongoose_1.default.model('Zone', zoneSchema);
exports.default = exports.Zone;
