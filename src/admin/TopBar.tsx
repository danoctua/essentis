/** The bar every screen shares: it stays at the top, so Save and its state are always in sight. */
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { isPending, type PublishState } from './data';
import { s } from './strings';
import { when } from './util';

export interface ShellState { email: string; publish: PublishState; busy: boolean; msg: string; update: () => void; signOut: () => void }
export const Shell = createContext<ShellState>(null!);

export const publishHint = ({ msg, publish }: ShellState) =>
  msg || `${isPending(publish) ? s.pending : `${s.lastPublish}: ${publish.lastAt ? when(publish.lastAt) : s.never}`}${publish.lastError ? ` (${publish.lastError})` : ''}`;

/** Phones only: on a wide screen the header has all of this. Updating the site is here even with nothing pending. */
function Menu() {
  const shell = useContext(Shell), el = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const d = el.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close); };
  }, []);
  return (
    <details class="menu" ref={el}>
      <summary aria-label={s.menu}><span aria-hidden="true">⋯</span></summary>
      <div class="menu-list">
        <button type="button" onClick={shell.update} disabled={shell.busy}>{s.publishSite}</button>
        <p class="hint">{publishHint(shell)}</p>
        <a href="/" target="_blank" rel="noopener">{s.openSite}</a>
        <button type="button" onClick={shell.signOut}>{s.signOut}</button>
        <p class="hint">{shell.email}</p>
      </div>
    </details>
  );
}

interface Props {
  title: string;
  /** A hash to go back to. Screens without it are main ones: they show their title and the menu. */
  back?: string;
  status?: ComponentChildren;
  error?: string;
  notice?: ComponentChildren;
  children?: ComponentChildren;
}

export function TopBar({ title, back, status, error, notice, children }: Props) {
  const shell = useContext(Shell);
  const showUpdate = !back && (!!shell.msg || isPending(shell.publish));
  // Notices make the bar taller: whatever sticks below it, and the cursor, follow its real height (--top).
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = document.documentElement, el = bar.current!;
    const set = () => root.style.setProperty('--top', `${el.offsetHeight}px`);
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(set);
    o.observe(el);
    return () => { o.disconnect(); root.style.removeProperty('--top'); };
  }, []);
  return (
    <div class="topbar" ref={bar}>
      <div class="topbar-row">
        {back && <a class="icon" href={back} aria-label={s.back}><span aria-hidden="true">←</span></a>}
        <h1 class={back ? 'vh' : 'topbar-title'}>{title}</h1>
        <span class="status" role="status">{status}</span>
        {children}
        {!back && <Menu />}
      </div>
      {error && <p class="strip err" role="alert">{error}</p>}
      {notice && <div class="strip">{notice}</div>}
      {showUpdate && (
        <div class="strip update">
          <span>{shell.msg || s.pending}</span>
          {!shell.msg && <button type="button" class="btn" onClick={shell.update} disabled={shell.busy}>{s.publishShort}</button>}
        </div>
      )}
    </div>
  );
}

/** "Not saved, a copy is in the browser", "Saving…" or "Saved". */
export function SaveState({ dirty, busy, kept, saved }: { dirty: boolean; busy: boolean; kept: boolean; saved?: boolean }) {
  if (busy) return <>{s.saving}</>;
  if (dirty) return <>{s.unsaved}{kept && <small>{s.keptHere}</small>}</>;
  return <>{saved ? s.saved : ''}</>;
}

export function Restored({ at, onDiscard }: { at: string; onDiscard: () => void }) {
  return (
    <>
      <span>{s.restored(when(at))}</span>
      <button type="button" class="btn" onClick={() => { if (confirm(s.confirmDiscard)) onDiscard(); }}>{s.discard}</button>
    </>
  );
}
