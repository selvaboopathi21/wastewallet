// Multer Upload Middleware: Handles multipart/form-data image uploads
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import ApiError from '../utils/ApiError';

// Store files in memory so we can upload the buffer directly to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

export const uploadPhotos = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes per image limit
    files: 5, // Maximum 5 images per request
  },
});

export default uploadPhotos;
