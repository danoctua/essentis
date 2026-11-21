// Gives a Firebase Auth account access to /admin by setting the custom claim `admin: true`.
// Sign in at /admin once first (that creates the account), then:
//
//   npm run admin:grant -- you@example.com            give access
//   npm run admin:grant -- you@example.com --revoke   take it away
//
// Reads FIREBASE_SERVICE_ACCOUNT from .env. With FIREBASE_AUTH_EMULATOR_HOST set, uses the emulator.
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv.slice(2).find((a) => !a.startsWith('--'));
const revoke = process.argv.includes('--revoke');
if (!email) throw new Error('Usage: npm run admin:grant -- you@example.com [--revoke]');

const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (raw) {
  const sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), projectId: sa.project_id });
} else if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  initializeApp({ projectId: 'demo-essentis' });
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. Put it in .env.');
}

const auth = getAuth();
const user = await auth.getUserByEmail(email).catch(() => {
  throw new Error(`No account for ${email}. Sign in at /admin once first, then run this again.`);
});
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: revoke ? undefined : true });
console.log(revoke ? `Access removed for ${email}.` : `${email} can now use /admin. Press "Праверыць зноў" there, or sign in again.`);
