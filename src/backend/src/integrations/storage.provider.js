import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, "../../uploads");

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
  async save({ buffer, mimeType, key }) {
    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append("file", blob, key);
    form.append("upload_preset", "civicverify");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
      { method: "POST", body: form }
    );
    if (!res.ok) {
      throw new Error("Cloudinary upload failed");
    }
    const json = await res.json();
    return { storageKey: json.public_id, publicUrl: json.secure_url };
  }
}

export function getStorageProvider() {
  if (env.storageProvider === "cloudinary" && env.cloudinary.cloudName) {
    return new CloudinaryStorageProvider();
  }
  return new LocalStorageProvider();
}
