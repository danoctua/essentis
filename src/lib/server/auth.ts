/**
 * Who may call the admin's API: a signed-in Firebase user whose token carries the custom claim
 * `admin: true` (set once with `npm run admin:grant`). The same claim opens Firestore in firestore.rules.
 */
import { env } from './env';
import { json, notConfigured } from './route';

export async function requireAdmin(request: Request): Promise<{ uid: string } | Response> {
  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return json(401, { error: 'Sign in first.' });
  const { adminApp, NotConfigured } = await import('../firebaseAdmin');
  let app;
  try {
    app = adminApp(env('FIREBASE_SERVICE_ACCOUNT'));
  } catch (e) {
    if (e instanceof NotConfigured) return notConfigured('FIREBASE_SERVICE_ACCOUNT');
    throw e;
  }
  const { getAuth } = await import('firebase-admin/auth');
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    if (decoded.admin !== true) return json(403, { error: 'This account has no access.' });
    return { uid: decoded.uid };
  } catch {
    return json(401, { error: 'Your sign-in has expired. Sign in again.' });
  }
}
