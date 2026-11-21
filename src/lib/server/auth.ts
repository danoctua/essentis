/**
 * Who may call the admin's API: a signed-in Firebase user whose token carries the custom claim
 * `admin: true` (set once with `npm run admin:grant`). The same claim opens Firestore in firestore.rules.
 */
import { getAuth } from 'firebase-admin/auth';
import { adminApp, NotConfigured } from '../firebaseAdmin';
import { env } from './env';

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const notConfigured = (what: string) => json(503, { error: `Not configured on this deploy: ${what}.` });

export async function requireAdmin(request: Request): Promise<{ uid: string } | Response> {
  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return json(401, { error: 'Sign in first.' });
  let app;
  try {
    app = adminApp(env('FIREBASE_SERVICE_ACCOUNT'));
  } catch (e) {
    if (e instanceof NotConfigured) return notConfigured('FIREBASE_SERVICE_ACCOUNT');
    throw e;
  }
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    if (decoded.admin !== true) return json(403, { error: 'This account has no access.' });
    return { uid: decoded.uid };
  } catch {
    return json(401, { error: 'Your sign-in has expired. Sign in again.' });
  }
}
