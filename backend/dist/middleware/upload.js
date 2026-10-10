"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPhotos = void 0;
// Multer Upload Middleware: Handles multipart/form-data image uploads
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// Store files in memory so we can upload the buffer directly to Cloudinary
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new ApiError_1.default(400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
};
exports.uploadPhotos = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 Megabytes per image limit
        files: 5, // Maximum 5 images per request
    },
});
exports.default = exports.uploadPhotos;
