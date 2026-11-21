/**
 * PUBLIC_FIREBASE_CONFIG is the web app's config object. It should be one-line JSON, but people
 * often paste the JavaScript from the Firebase console (unquoted keys, `const firebaseConfig = …;`),
 * so both are accepted. It is public by design: the Firestore rules protect the data.
 */
export interface WebConfig { apiKey: string; authDomain: string; projectId: string; [k: string]: string }

export function parseWebConfig(raw: string | undefined): WebConfig {
  if (!raw?.trim()) throw new Error('PUBLIC_FIREBASE_CONFIG is not set. Copy the web app config from Firebase → Project settings → Your apps, then rebuild.');
  let s = raw.trim().replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '').replace(/;\s*$/, '');
  let cfg: unknown;
  try {
    cfg = JSON.parse(s);
  } catch {
    s = s.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/'([^']*)'/g, '"$1"').replace(/,\s*}/g, '}');
    try { cfg = JSON.parse(s); } catch { throw new Error('PUBLIC_FIREBASE_CONFIG is not a config object. Paste the {...} part of the Firebase web config as one line.'); }
  }
  const c = cfg as Partial<WebConfig>;
  if (!c.apiKey || !c.authDomain || !c.projectId) throw new Error('PUBLIC_FIREBASE_CONFIG needs apiKey, authDomain and projectId.');
  return c as WebConfig;
}
