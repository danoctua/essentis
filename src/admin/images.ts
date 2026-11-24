/**
 * Photos are resized in the browser to WebP at 400, 800 and 1600 px wide, then uploaded straight to
 * R2 with signed URLs. Every image is redrawn on a canvas, so the camera's EXIF data (GPS position,
 * device) never leaves the computer; the original file is never uploaded.
 */
import { api } from './firebase';
import { mediaFile, WIDTHS, type Width } from '../lib/media';
import { MEDIA_URL } from '../lib/site';

const MAX_BYTES = 40 * 1024 * 1024;

async function hash16(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function encode(bmp: Decoded, width: number): Promise<Blob> {
  const w = Math.min(width, bmp.width), h = Math.round((bmp.height * w) / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp.source, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.82));
  if (blob?.type === 'image/webp') return blob;
  // Some browsers (Safari) cannot write WebP and answer with PNG: encode it here instead. Loaded only when needed.
  const { default: encodeWebp } = await import('@jsquash/webp/encode');
  const bytes = await encodeWebp(ctx.getImageData(0, 0, w, h), { quality: 82 });
  return new Blob([bytes], { type: 'image/webp' });
}

interface Decoded { source: CanvasImageSource; width: number; height: number; close: () => void }

/** The photo's pixels, turned the way the camera held it. */
async function decode(file: File): Promise<Decoded> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // No createImageBitmap, or not with options: an <img> applies the orientation by itself.
    const url = URL.createObjectURL(file), img = new Image();
    img.src = url;
    try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error('this photo cannot be read'); }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  }
}

export interface Uploaded { base: string; w: number; h: number }

export async function uploadImage(file: File, postId: string): Promise<Uploaded> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.type || 'this file'} is not an image`);
  if (file.size > MAX_BYTES) throw new Error('the file is larger than 40 MB');
  const bmp = await decode(file);
  try {
    const hash = await hash16(file);
    // One at a time: three canvases of a large photo at once can run a phone out of memory.
    const blobs: Blob[] = [];
    for (const w of WIDTHS) blobs.push(await encode(bmp, w));
    const { base, urls } = await api<{ base: string; urls: Record<Width, string> }>('/api/media/sign/', { postId, hash, w: bmp.width, h: bmp.height });
    await Promise.all(WIDTHS.map(async (w, i) => {
      const res = await fetch(urls[w], { method: 'PUT', headers: { 'content-type': 'image/webp' }, body: blobs[i] });
      if (!res.ok) throw new Error(`R2 answered ${res.status} (check the bucket's CORS rule)`);
    }));
    return { base, w: bmp.width, h: bmp.height };
  } finally {
    bmp.close();
  }
}

/** The URL to put in Markdown: the largest size; the site adds srcset from it. */
export const imageUrl = (base: string) => `${MEDIA_URL}/${mediaFile(base, 1600)}`;
