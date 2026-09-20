import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, "../../uploads");

let cloudinaryConfigured = false;
function ensureCloudinaryConfig() {
  if (cloudinaryConfigured) return true;
  if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    cloudinaryConfigured = true;
    return true;
  }
  return false;
}

class LocalStorageProvider {
  async save({ buffer, mimeType, key }) {
    await fs.mkdir(uploadsDir, { recursive: true });
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const filename = `${key}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
    return {
      storageKey: filename,
      publicUrl: `/uploads/${filename}`,
    };
  }
}

class CloudinaryStorageProvider {
  constructor() {
    this.fallback = new LocalStorageProvider();
  }

  async save({ buffer, mimeType, key }) {
    if (!ensureCloudinaryConfig()) {
      console.warn("[Storage] Cloudinary credentials missing, falling back to local storage");
      return this.fallback.save({ buffer, mimeType, key });
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "civicverify/complaints",
            public_id: key,
            resource_type: "image",
            overwrite: true,
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        uploadStream.end(buffer);
      });

      return {
        storageKey: result.public_id,
        publicUrl: result.secure_url,
      };
    } catch (err) {
      console.warn(`[Storage] Cloudinary upload failed (${err.message}), falling back to local storage`);
      return this.fallback.save({ buffer, mimeType, key });
    }
  }
}

export function getStorageProvider() {
  if (env.cloudinaryUrl || env.cloudinary.cloudName) {
    return new CloudinaryStorageProvider();
  }
  return new LocalStorageProvider();
}
