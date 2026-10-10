"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBuffer = void 0;
// Cloudinary Configuration and Upload Helper with Dev Fallback
const cloudinary_1 = require("cloudinary");
const logger_1 = __importDefault(require("../utils/logger"));
// Configure Cloudinary if credentials are provided in .env
const isConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);
if (isConfigured) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    logger_1.default.info('☁️ Cloudinary image service configured successfully');
}
else {
    logger_1.default.info('ℹ️ Cloudinary credentials not set in .env: using local mock upload for development');
}
/**
 * Upload an image buffer to Cloudinary or return a dev data-url/mock
 */
const uploadImageBuffer = async (buffer, folder = 'wastewallet/pickups') => {
    if (isConfigured) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
                if (error || !result) {
                    return reject(error || new Error('Upload to Cloudinary failed'));
                }
                resolve(result.secure_url);
            });
            stream.end(buffer);
        });
    }
    // Development Fallback: Return a base64 Data URI or mock URL so development works without Cloudinary keys
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64.substring(0, 100)}...[dev_image_mock]`;
};
exports.uploadImageBuffer = uploadImageBuffer;
exports.default = {
    uploadImageBuffer: exports.uploadImageBuffer,
};
