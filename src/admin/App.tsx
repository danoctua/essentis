/**
 * The admin: sign-in gate, navigation and the "update site" button. Routes live in the hash
 * (#/, #/post/{id}, #/now, #/about, #/work) so /admin stays one static page.
 */
import { useEffect, useState } from 'preact/hooks';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { api, firebase } from './firebase';
import { watchPublish, type PublishState } from './data';
import { s } from './strings';
import { PostsList } from './PostsList';
import { PostEditor } from './PostEditor';
import { NowEditor } from './NowEditor';
import { AboutEditor } from './AboutEditor';
import { WorkEditor } from './WorkEditor';
import { markPaths } from '../lib/graphics';
import { unsaved, when } from './util';

type Gate =
  | { k: 'loading' } | { k: 'broken'; why: string } | { k: 'out' }
  | { k: 'denied'; user: User } | { k: 'rules'; user: User } | { k: 'in'; user: User };

function Mark() {
  const { outer, inner } = markPaths();
  return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={outer} fill="var(--rust)" /><path d={inner} fill="var(--ink)" /></svg>;
}

function useHash() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    let prev = location.hash || '#/';
    const onChange = () => {
      if (unsaved.current && !confirm(s.leave)) { history.replaceState(null, '', prev); return; }
      unsaved.current = false;
      prev = location.hash || '#/';
      setHash(prev);
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (unsaved.current) e.preventDefault(); };
    addEventListener('hashchange', onChange);
    addEventListener('beforeunload', onLeave);
    return () => { removeEventListener('hashchange', onChange); removeEventListener('beforeunload', onLeave); };
  }, []);
  return hash;
}

function PublishButton() {
  const [state, setState] = useState<PublishState>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => watchPublish(setState, () => {}), []);
  const go = async () => {
    setBusy(true); setMsg(s.publishing);
    try { await api('/api/publish/'); setMsg(s.publishStarted); } catch (e) { setMsg(`${s.error}: ${(e as Error).message}`); }
    setBusy(false);
  };
  return (
    <div class="publish">
      <button type="button" class="btn primary" onClick={go} disabled={busy}>{s.publishSite}</button>
      <p class="hint" role="status">{msg || `${s.lastPublish}: ${state.lastAt ? when(state.lastAt) : s.never}`}{state.lastError && !msg ? ` (${state.lastError})` : ''}</p>
    </div>
  );
}

function Shell({ user, hash }: { user: User; hash: string }) {
  const [, route, id] = hash.split('/');
  const nav = [['#/', s.posts, !route || route === 'post'], ['#/now', s.now, route === 'now'], ['#/about', s.about, route === 'about'], ['#/work', s.work, route === 'work']] as const;
  return (
    <>
      <header class="bar">
        <a class="brand" href="/" target="_blank" rel="noopener"><Mark /><span>essentis</span></a>
        <nav aria-label={s.admin}><ul>{nav.map(([href, label, on]) => <li><a href={href} aria-current={on ? 'page' : undefined}>{label}</a></li>)}</ul></nav>
        <PublishButton />
        <div class="who"><span>{user.email}</span><button type="button" class="link" onClick={() => signOut(firebase().auth)}>{s.signOut}</button></div>
      </header>
      <main id="main" class="page">
        {route === 'post' && id ? <PostEditor key={id} id={id} />
          : route === 'now' ? <NowEditor />
          : route === 'about' ? <AboutEditor />
          : route === 'work' ? <WorkEditor />
          : <PostsList />}
      </main>
    </>
  );
}

export default function App() {
  const [gate, setGate] = useState<Gate>({ k: 'loading' });
  const hash = useHash();

  const check = async (user: User, refresh = false) => {
    const token = await user.getIdTokenResult(refresh);
    if (token.claims.admin !== true) return setGate({ k: 'denied', user });
    try {
      await getDoc(doc(firebase().db, 'meta', 'publish'));
      setGate({ k: 'in', user });
    } catch (e) {
      setGate((e as { code?: string }).code === 'permission-denied' ? { k: 'rules', user } : { k: 'broken', why: (e as Error).message });
    }
  };

  useEffect(() => {
    let auth;
    try { auth = firebase().auth; } catch (e) { setGate({ k: 'broken', why: (e as Error).message }); return; }
    return onAuthStateChanged(auth, (user) => (user ? check(user) : setGate({ k: 'out' })));
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(firebase().auth, provider); } catch (e) { setGate({ k: 'broken', why: (e as Error).message }); }
  };

  if (gate.k === 'in') return <Shell user={gate.user} hash={hash} />;
  return (
    <main class="gate">
      <Mark />
      <h1 class="page-title">{s.admin}</h1>
      {gate.k === 'loading' && <p>{s.loading}</p>}
      {gate.k === 'broken' && <><p class="err">{s.notSetUp}: {gate.why}</p><button type="button" class="btn" onClick={() => location.reload()}>{s.checkAgain}</button></>}
      {gate.k === 'out' && <><p class="muted">{s.signInNote}</p><button type="button" class="btn primary" onClick={signIn}>{s.signIn}</button></>}
      {gate.k === 'denied' && <>
        <p class="err">{s.noAccess}: {gate.user.email}</p>
        <p>{s.noAccessHint}</p>
        <pre class="cmd">npm run admin:grant -- {gate.user.email}</pre>
        <p>{s.noAccessThen}</p>
        <div class="row"><button type="button" class="btn primary" onClick={() => check(gate.user, true)}>{s.checkAgain}</button><button type="button" class="btn" onClick={() => signOut(firebase().auth)}>{s.signOut}</button></div>
      </>}
      {gate.k === 'rules' && <>
        <p class="err">{s.rulesMissing}</p>
        <p>{s.rulesHint}</p>
        <div class="row"><button type="button" class="btn primary" onClick={() => check(gate.user, true)}>{s.checkAgain}</button><button type="button" class="btn" onClick={() => signOut(firebase().auth)}>{s.signOut}</button></div>
      </>}
    </main>
  );
}
