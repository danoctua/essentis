/**
 * Reads every collection the site needs from Firestore, once per build, with the admin SDK.
 * The service account comes base64-encoded from FIREBASE_SERVICE_ACCOUNT. Firestore rules deny
 * all public reads, so drafts never leave the database except through this build.
 */
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { adminApp } from './firebaseAdmin';
import type { RawContent } from './content';

export { parseServiceAccount } from './firebaseAdmin';

/** Firestore Timestamps become ISO strings, everywhere in a document. */
export function plain(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate(): Date }).toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
}

export async function readFirestore(serviceAccount: string): Promise<RawContent> {
  const db = getFirestore(adminApp(serviceAccount));
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
