// Writes the first real content into an empty Firestore: the Now, About and Uses texts, the
// filled-in Work and Projects entries, and the Łacinka post as a draft. Sample posts and
// placeholders ("[Роля]") are skipped. Existing documents are never overwritten, so running it
// twice is safe.
//
//   npm run seed -- --dry-run   show what would be written
//   npm run seed                write it (reads FIREBASE_SERVICE_ACCOUNT from .env)
//
// With FIRESTORE_EMULATOR_HOST set, it writes to the local emulator instead.
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const dry = process.argv.includes('--dry-run');
const read = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
const placeholder = (o) => JSON.stringify(o).includes('[');
const ts = (iso) => Timestamp.fromDate(new Date(iso));

const pages = read('pages');
const docs = [
  ['pages/now', { ...pages.now, updatedAt: Timestamp.now() }],
  ['pages/about', pages.about],
  ['pages/uses', pages.uses],
  ...read('work').filter((w) => !placeholder(w)).map(({ id, ...w }) => [`work/${id}`, w]),
  ...read('projects').filter((p) => !placeholder(p)).map(({ id, ...p }) => [`projects/${id}`, p]),
  ...read('posts').filter((p) => p.id === 'lacinka').map(({ id, ...p }) => [`posts/${id}`, {
    ...p, status: 'draft', publishedAt: ts(p.publishedAt), updatedAt: ts(p.updatedAt),
  }]),
];

if (dry) {
  for (const [path] of docs) console.log(`would create ${path}`);
  process.exit(0);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. Put it in .env (base64 of the key JSON).');
const sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), projectId: sa.project_id });
const db = getFirestore();
console.log(`Firestore: ${process.env.FIRESTORE_EMULATOR_HOST ? `emulator at ${process.env.FIRESTORE_EMULATOR_HOST}` : `project ${sa.project_id}`}`);

for (const [path, data] of docs) {
  try {
    await db.doc(path).create(data);
    console.log(`created ${path}`);
  } catch (e) {
    if (e.code === 6) console.log(`exists, kept ${path}`); // ALREADY_EXISTS
    else throw e;
  }
}
