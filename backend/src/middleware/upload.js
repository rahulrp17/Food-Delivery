import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import ApiError from "../utils/apiError.js";
import { LIMITS } from "../config/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.resolve(__dirname, "../../uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = ALLOWED_TYPES.get(file.mimetype) || "";
    cb(null, `${randomUUID()}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: LIMITS.UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(ApiError.badRequest("Only JPEG, PNG, WebP, or AVIF images are allowed"));
    }
    cb(null, true);
  },
});

export default upload;
