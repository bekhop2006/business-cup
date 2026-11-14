import { z } from "zod";

// Kept below the proxy's 10 MB request body buffer.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const UPLOAD_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type UploadMimeType = keyof typeof UPLOAD_EXTENSIONS;

export const ACCEPTED_UPLOAD_TYPES = Object.keys(UPLOAD_EXTENSIONS).join(",");

export const uploadFileSchema = z
  .instanceof(File, { message: "Choose a file to upload." })
  .refine((file) => file.size > 0, "This file is empty.")
  .refine(
    (file) => file.size <= MAX_UPLOAD_BYTES,
    "This file is larger than 8 MB. Try a smaller photo or a PDF.",
  );

// Detects the real file type from its first bytes, so a renamed file
// cannot pass as a PDF or an image.
export function sniffUploadType(bytes: Uint8Array): UploadMimeType | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp"; // RIFF....WEBP
  }
  return null;
}
