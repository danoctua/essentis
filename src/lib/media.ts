/**
 * Photos in R2. Each upload is stored at three widths: `{base}-{400|800|1600}.webp`. The base name
 * carries a content hash and the original size, `posts/{postId}/{hash}-{w}x{h}`, so a page can set
 * width, height and srcset from the URL alone. Never derived from the original file name.
 */
export const WIDTHS = [400, 800, 1600] as const;
export type Width = (typeof WIDTHS)[number];

export const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const HASH_RE = /^[0-9a-f]{16}$/;
export const BASE_RE = /^posts\/[A-Za-z0-9_-]{1,64}\/[0-9a-f]{16}-[1-9]\d{0,4}x[1-9]\d{0,4}$/;

export const mediaBase = (postId: string, hash: string, w: number, h: number) => `posts/${postId}/${hash}-${w}x${h}`;
export const mediaFile = (base: string, width: Width) => `${base}-${width}.webp`;

/** Splits a URL of one of our images into its base and size; null for anything else. */
export function parseMediaUrl(src: string, mediaUrl: string): { base: string; w: number; h: number } | null {
  if (!src.startsWith(`${mediaUrl}/`)) return null;
  const m = /^(.+-([1-9]\d*)x([1-9]\d*))-(?:400|800|1600)\.webp$/.exec(src.slice(mediaUrl.length + 1));
  if (!m || !BASE_RE.test(m[1])) return null;
  return { base: m[1], w: Number(m[2]), h: Number(m[3]) };
}
