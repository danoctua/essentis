/**
 * The admin: sign-in gate, navigation and the "update site" button. Routes live in the hash
 * (#/, #/post/{id}, #/new, #/now, #/about, #/work) so /admin stays one static page.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { api, firebase } from './firebase';
import { newPostId, watchPublish, type EditPost, type PublishState } from './data';
import { readDraft } from './drafts';
import { publishHint, Shell as ShellContext, type ShellState } from './TopBar';
import { s } from './strings';
import { PostsList } from './PostsList';
import { PostEditor } from './PostEditor';
import { NowEditor } from './NowEditor';
import { AboutEditor } from './AboutEditor';
import { WorkEditor } from './WorkEditor';
import { markPaths } from '../lib/graphics';
import { unsaved } from './util';

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
    const follow = () => { prev = location.hash || '#/'; setHash(prev); };
    const onChange = () => {
      if (unsaved.current && !confirm(s.leave)) { history.replaceState(null, '', prev); return; }
      unsaved.current = false;
      follow();
      scrollTo(0, 0);
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (unsaved.current) e.preventDefault(); };
    addEventListener('hashchange', onChange);
    addEventListener('admin:hash', follow);
    addEventListener('beforeunload', onLeave);
    return () => { removeEventListener('hashchange', onChange); removeEventListener('admin:hash', follow); removeEventListener('beforeunload', onLeave); };
  }, []);
  return hash;
}

/** `html[data-typing]` while a text field has the focus: the bottom navigation would sit on top of the keyboard. */
function useTyping() {
  useEffect(() => {
    const root = document.documentElement;
    const isField = (e: EventTarget | null) => e instanceof HTMLElement && (e.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
    const on = (e: FocusEvent) => { root.toggleAttribute('data-typing', isField(e.target)); };
    const off = () => { root.removeAttribute('data-typing'); };
    addEventListener('focusin', on);
    addEventListener('focusout', off);
    return () => { off(); removeEventListener('focusin', on); removeEventListener('focusout', off); };
  }, []);
}

function usePublish(): Pick<ShellState, 'publish' | 'busy' | 'msg' | 'update'> {
  const [publish, setPublish] = useState<PublishState>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => watchPublish(setPublish, () => {}), []);
  useEffect(() => {
    if (!msg || busy) return;
    const t = setTimeout(() => setMsg(''), 12_000);
    return () => clearTimeout(t);
  }, [msg, busy]);
  const update = async () => {
    setBusy(true); setMsg(s.publishing);
    try { await api('/api/publish/'); setMsg(s.publishStarted); } catch (e) { setMsg(`${s.error}: ${(e as Error).message}`); }
    setBusy(false);
  };
  return { publish, busy, msg, update };
}

function Admin({ user, hash }: { user: User; hash: string }) {
  useTyping();
  const pub = usePublish();
  const [, route, part] = hash.split('/');
  // A new post gets its id here and is written on the first save; text left from last time keeps its own.
  const fresh = useMemo(() => (route === 'new' ? readDraft<EditPost>('post:new')?.data.id ?? newPostId() : ''), [hash]);
  const id = route === 'new' ? fresh : route === 'post' ? part : '';
  const nav = ([['#/', s.posts, s.posts, ''], ['#/now', s.now, s.now, 'now'], ['#/about', s.about, s.about, 'about'], ['#/work', s.work, s.workShort, 'work']] as const)
    .map(([href, long, short, r]) => ({ href, long, short, on: r ? route === r : !route || !!id }));
  const shell: ShellState = { email: user.email ?? '', ...pub, signOut: () => signOut(firebase().auth) };
  return (
    <ShellContext.Provider value={shell}>
      <header class="bar">
        <a class="brand" href="/" target="_blank" rel="noopener"><Mark /><span>essentis</span></a>
        <nav aria-label={s.admin}><ul>{nav.map((n) => <li><a href={n.href} aria-current={n.on ? 'page' : undefined}>{n.long}</a></li>)}</ul></nav>
        <div class="publish">
          <button type="button" class="btn primary" onClick={pub.update} disabled={pub.busy}>{s.publishSite}</button>
          <p class="hint" role="status">{publishHint(shell)}</p>
        </div>
        <div class="who"><span>{user.email}</span><button type="button" class="link" onClick={shell.signOut}>{s.signOut}</button></div>
      </header>
      <main id="main" class="page">
        {id ? <PostEditor key={id} id={id} isNew={route === 'new'} />
          : route === 'now' ? <NowEditor />
          : route === 'about' ? <AboutEditor />
          : route === 'work' ? <WorkEditor />
          : <PostsList />}
      </main>
      {!id && <nav class="bottom" aria-label={s.admin}><ul>{nav.map((n) => <li><a href={n.href} aria-current={n.on ? 'page' : undefined}>{n.short}</a></li>)}</ul></nav>}
    </ShellContext.Provider>
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

  if (gate.k === 'in') return <Admin user={gate.user} hash={hash} />;
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
        <div class="actions"><button type="button" class="btn primary" onClick={() => check(gate.user, true)}>{s.checkAgain}</button><button type="button" class="btn" onClick={() => signOut(firebase().auth)}>{s.signOut}</button></div>
      </>}
      {gate.k === 'rules' && <>
        <p class="err">{s.rulesMissing}</p>
        <p>{s.rulesHint}</p>
        <div class="actions"><button type="button" class="btn primary" onClick={() => check(gate.user, true)}>{s.checkAgain}</button><button type="button" class="btn" onClick={() => signOut(firebase().auth)}>{s.signOut}</button></div>
      </>}
    </main>
  );
}
