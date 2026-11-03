// Optional photo for a task (e.g. a picture of the toothbrush). Stored as a tiny JPEG data URL inside the routine.
export const MAX_PHOTO_CHARS = 40_000;
export const isSafePhoto = (v) => typeof v === 'string' && v.length <= MAX_PHOTO_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

/** Center-crop to a square and downscale; keeps the stored size around 5-15 KB. */
export async function resizeToDataUrl(file, size = 112) {
  if (!file || file.size > 15 * 1024 * 1024 || !/^image\//.test(file.type)) throw new Error('bad-image');
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), c = Object.assign(document.createElement('canvas'), { width: size, height: size });
  c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  bmp.close?.();
  for (const q of [0.72, 0.55, 0.4]) { const url = c.toDataURL('image/jpeg', q); if (isSafePhoto(url)) return url; }
  throw new Error('too-big');
}
