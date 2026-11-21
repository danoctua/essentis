/**
 * POST → rebuilds the site through the Vercel deploy hook. Admin only, at most once a minute.
 * The last time is kept in Firestore (meta/publish): functions keep no memory between calls.
 */
import type { APIRoute } from 'astro';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminApp } from '../../lib/firebaseAdmin';
import { env } from '../../lib/server/env';
import { json, notConfigured, requireAdmin } from '../../lib/server/auth';

export const prerender = false;
const GAP_MS = 60_000;

export const POST: APIRoute = async ({ request }) => {
  const who = await requireAdmin(request);
  if (who instanceof Response) return who;
  const hook = env('VERCEL_DEPLOY_HOOK_URL');
  if (!hook) return notConfigured('VERCEL_DEPLOY_HOOK_URL');
  const db = getFirestore(adminApp(env('FIREBASE_SERVICE_ACCOUNT')));
  const ref = db.doc('meta/publish');
  const now = Date.now();
  const wait = await db.runTransaction(async (tx) => {
    const last = ((await tx.get(ref)).get('lastAt') as Timestamp | undefined)?.toMillis() ?? 0;
    if (now - last < GAP_MS) return Math.ceil((GAP_MS - (now - last)) / 1000);
    tx.set(ref, { lastAt: Timestamp.fromMillis(now), lastError: null }, { merge: true });
    return 0;
  });
  if (wait) return json(429, { error: `The site was rebuilt less than a minute ago. Try again in ${wait} s.`, retryAfter: wait });
  const res = await fetch(hook, { method: 'POST' }).catch(() => null);
  if (!res?.ok) {
    const why = res ? `Vercel answered ${res.status}` : 'Vercel did not answer';
    await ref.set({ lastError: why }, { merge: true });
    return json(502, { error: why });
  }
  return json(200, { at: new Date(now).toISOString() });
};
