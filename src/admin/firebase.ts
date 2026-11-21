/**
 * Firebase in the browser. Emulators are used only on the dev server with PUBLIC_FIREBASE_EMULATORS=1
 * (npm run dev:emulators); a production bundle never contains that branch.
 */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';
import { parseWebConfig } from './config';

export const EMULATORS = import.meta.env.DEV && import.meta.env.PUBLIC_FIREBASE_EMULATORS === '1';

let made: { auth: Auth; db: Firestore } | undefined;

/** Throws with a readable message when the config is missing or broken. */
export function firebase(): { auth: Auth; db: Firestore } {
  if (made) return made;
  const config = EMULATORS
    ? { apiKey: 'demo-key', authDomain: 'demo-essentis.firebaseapp.com', projectId: 'demo-essentis' }
    : parseWebConfig(import.meta.env.PUBLIC_FIREBASE_CONFIG);
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (EMULATORS) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return (made = { auth, db });
}

/** POST to one of the admin's API routes with the signed-in user's token. */
export async function api<T>(path: string, body: unknown = {}): Promise<T> {
  const user = firebase().auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const res = await fetch(path, {
    method: 'POST',
    headers: { authorization: `Bearer ${await user.getIdToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
