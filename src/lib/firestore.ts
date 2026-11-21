/**
 * Reads every collection the site needs from Firestore, once per build, with the admin SDK.
 * The service account comes base64-encoded from FIREBASE_SERVICE_ACCOUNT. Firestore rules deny
 * all public reads, so drafts never leave the database except through this build.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import type { RawContent } from './content';

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

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

/** Firestore Timestamps become ISO strings, everywhere in a document. */
export function plain(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate(): Date }).toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
}

function app(sa: ServiceAccount): App {
  const name = 'essentis-build';
  return getApps().find((a) => a.name === name)
    ?? initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), projectId: sa.project_id }, name);
}

export async function readFirestore(serviceAccount: string): Promise<RawContent> {
  const db = getFirestore(app(parseServiceAccount(serviceAccount)));
  const all = async (name: string) =>
    (await db.collection(name).get()).docs.map((d) => ({ ...(plain(d.data()) as DocumentData), id: d.id }));
  const page = async (id: string) => {
    const d = await db.collection('pages').doc(id).get();
    return d.exists ? (plain(d.data()) as DocumentData) : undefined;
  };
  const [posts, work, projects, notes, now, about, uses] = await Promise.all([
    all('posts'), all('work'), all('projects'), all('notes'), page('now'), page('about'), page('uses'),
  ]);
  return { posts, work, projects, notes, now, about, uses } as RawContent;
}
