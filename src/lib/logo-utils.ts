import sharp from 'sharp';

// Logos above this size are downscaled; small ones are left untouched.
const MAX_DIMENSION = 400; // px — ample for the sidebar (48px), login, and payslip (~24mm)
const SKIP_BELOW_BYTES = 40 * 1024; // 40 KB — already small enough, don't re-encode

/**
 * Compress a logo provided as a base64 data URL so it stays small enough to be
 * embedded in hot API responses (tenant branding, superadmin tenants list).
 * Full-resolution uploads (often hundreds of KB) are the main cause of slow
 * page loads. Remote URLs and already-small logos are returned unchanged; any
 * failure falls back to the original input.
 */
export async function compressLogoDataUrl(input: string | null | undefined): Promise<string | null> {
  if (!input || typeof input !== 'string') return input ?? null;
  if (!input.startsWith('data:')) return input; // remote URL — leave as-is

  try {
    const base64 = input.split(',')[1];
    if (!base64) return input;

    const buf = Buffer.from(base64, 'base64');
    if (buf.length < SKIP_BELOW_BYTES) return input;

    const out = await sharp(buf)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();

    // Keep whichever is smaller (compression should always win for big inputs)
    if (out.length >= buf.length) return input;
    return `data:image/png;base64,${out.toString('base64')}`;
  } catch {
    return input;
  }
}
