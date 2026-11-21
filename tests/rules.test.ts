/**
 * Firestore rules, run against the emulator with the real firestore.rules. Skipped unless the
 * emulator is running: npm run emulators, then FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!host)('firestore.rules', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    const [h, port] = host!.split(':');
    env = await initializeTestEnvironment({ projectId: 'demo-essentis-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: h, port: Number(port) } });
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'posts/a'), { status: 'draft' }));
  });
  afterAll(() => env?.cleanup());

  it('lets the owner read and write', async () => {
    const db = env.authenticatedContext('owner', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'posts/a')));
    await assertSucceeds(setDoc(doc(db, 'pages/now'), { be: { body: 'x' } }));
  });
  it('shuts out other signed-in accounts', async () => {
    const db = env.authenticatedContext('someone', { email: 'x@example.com' }).firestore();
    await assertFails(getDoc(doc(db, 'posts/a')));
    await assertFails(setDoc(doc(db, 'posts/b'), { status: 'published' }));
  });
  it('shuts out visitors', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'posts/a')));
    await assertFails(setDoc(doc(db, 'meta/publish'), { lastAt: 0 }));
  });
});
