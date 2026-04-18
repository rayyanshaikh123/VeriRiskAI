export const MAX_FRAME_BYTES = 2_000_000;
export const MAX_FRAME_PIXELS = 4_000_000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export type ImageValidationResult = {
  ok: boolean;
  message?: string;
};

export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, message: "Unsupported image format" };
  }
  if (file.size > MAX_FRAME_BYTES) {
    return { ok: false, message: "Image exceeds size limit" };
  }
  return { ok: true };
}

export async function validateImagePixels(file: File): Promise<ImageValidationResult> {
  const bitmap = await createImageBitmap(file);
  const pixels = bitmap.width * bitmap.height;
  bitmap.close();
  if (pixels > MAX_FRAME_PIXELS) {
    return { ok: false, message: "Image exceeds pixel limit" };
  }
  return { ok: true };
}

export function stripBase64Prefix(payload: string): string {
  const marker = "base64,";
  const index = payload.indexOf(marker);
  if (index === -1) {
    return payload;
  }
  return payload.slice(index + marker.length);
}

export function estimateBase64Bytes(payload: string): number {
  const base64 = stripBase64Prefix(payload).trim();
  if (!base64) {
    return 0;
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, (base64.length * 3) / 4 - padding);
}

export function validateBase64Size(payload: string, maxBytes: number): boolean {
  return estimateBase64Bytes(payload) <= maxBytes;
}
