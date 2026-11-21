/** POST {postId, hash, w, h} → upload URLs for the three WebP widths of one image. Admin only. */
import type { APIRoute } from 'astro';
import { json, notConfigured, requireAdmin } from '../../../lib/server/auth';
import { presignPut, r2Config } from '../../../lib/server/r2';
import { BASE_RE, HASH_RE, mediaBase, mediaFile, POST_ID_RE, WIDTHS } from '../../../lib/media';

export const prerender = false;

const size = (n: unknown) => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 20000;

export const POST: APIRoute = async ({ request }) => {
  const who = await requireAdmin(request);
  if (who instanceof Response) return who;
  const cfg = r2Config();
  if (!cfg) return notConfigured('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  const b = (await request.json().catch(() => null)) as { postId?: unknown; hash?: unknown; w?: unknown; h?: unknown } | null;
  if (!b || typeof b.postId !== 'string' || !POST_ID_RE.test(b.postId) || typeof b.hash !== 'string' || !HASH_RE.test(b.hash) || !size(b.w) || !size(b.h)) {
    return json(400, { error: 'Expected {postId, hash (16 hex), w, h}.' });
  }
  const base = mediaBase(b.postId, b.hash, b.w as number, b.h as number);
  if (!BASE_RE.test(base)) return json(400, { error: 'Bad media key.' });
  const urls = Object.fromEntries(await Promise.all(WIDTHS.map(async (w) => [w, await presignPut(cfg, mediaFile(base, w), 'image/webp')])));
  return json(200, { base, urls });
};
