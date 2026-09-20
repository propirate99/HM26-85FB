import multer from "multer";
import { env } from "../config/env.js";

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const err = new Error("Only JPEG, PNG, and WebP images are allowed");
    err.status = 400;
    cb(err, false);
  }
}

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.maxUploadMb * 1024 * 1024,
  },
  fileFilter,
});

export const upload = uploadMiddleware;

// Flexible single image uploader accepting either 'photo', 'file', or 'image'
export const singleImageUpload = (req, res, next) => {
  const upload = uploadMiddleware.fields([
    { name: "file", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files.file?.[0] || req.files.photo?.[0] || req.files.image?.[0];
    }
    next();
  });
};
