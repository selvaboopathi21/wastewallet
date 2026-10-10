// Cloudinary Configuration and Upload Helper with Dev Fallback
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import logger from '../utils/logger';

// Configure Cloudinary if credentials are provided in .env
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('☁️ Cloudinary image service configured successfully');
} else {
  logger.info('ℹ️ Cloudinary credentials not set in .env: using local mock upload for development');
}

/**
 * Upload an image buffer to Cloudinary or return a dev data-url/mock
 */
export const uploadImageBuffer = async (
  buffer: Buffer,
  folder = 'wastewallet/pickups'
): Promise<string> => {
  if (isConfigured) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error('Upload to Cloudinary failed'));
          }
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });
  }

  // Development Fallback: Return a base64 Data URI or mock URL so development works without Cloudinary keys
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64.substring(0, 100)}...[dev_image_mock]`;
};

export default {
  uploadImageBuffer,
};
