import multer from "multer";
import { env } from "../config/env.js";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(Object.assign(new Error("Unsupported file type"), { status: 400 }));
      return;
    }
    cb(null, true);
  },
});
