/**
 * The firebase-admin app, shared by the build (reading content) and the admin's API routes.
 * Credentials come base64-encoded from FIREBASE_SERVICE_ACCOUNT. With FIRESTORE_EMULATOR_HOST set
 * and no credentials, it talks to the local emulators as the offline project "demo-essentis".
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

export const EMULATOR_PROJECT = 'demo-essentis';
interface ServiceAccount { project_id: string; client_email: string; private_key: string }

/** Raised where a deploy has no Firebase credentials (Preview). API routes turn it into a 503. */
export class NotConfigured extends Error {}

/** Decodes FIREBASE_SERVICE_ACCOUNT: base64 of the key JSON (raw JSON is accepted too). */
export function parseServiceAccount(value: string): ServiceAccount {
  const v = value.trim();
  let json: unknown;
  try {
    json = JSON.parse(v.startsWith('{') ? v : Buffer.from(v, 'base64').toString('utf8'));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid base64 of the key JSON. Create it with: base64 -w0 key.json');
  }
  const sa = json as Partial<ServiceAccount>;
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key. Use the key from Project settings → Service accounts.');
  }
  return sa as ServiceAccount;
}

export function adminApp(serviceAccount: string | undefined): App {
  const name = 'essentis';
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;
  if (!serviceAccount) {
    if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: EMULATOR_PROJECT }, name);
    throw new NotConfigured('FIREBASE_SERVICE_ACCOUNT is not set');
  }
  const sa = parseServiceAccount(serviceAccount);
  return initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), projectId: sa.project_id }, name);
}
