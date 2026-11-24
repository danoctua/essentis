/**
 * Unsaved text, kept in this browser (localStorage) so a crash, a closed tab or a killed app loses nothing.
 * Every document has one copy, written while it differs from the saved version and removed once it does not.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { unsaved } from './util';

const PREFIX = 'essentis-draft:';
export interface Kept<T> { at: string; data: T }

export function readDraft<T>(key: string): Kept<T> | null {
  try {
    const k = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as Kept<T> | null;
    return k && typeof k.at === 'string' && k.data && typeof k.data === 'object' ? k : null;
  } catch { return null; }
}
/** False when the browser refuses (private mode, full storage): then leaving must be confirmed. */
export function writeDraft(key: string, data: unknown): boolean {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ at: new Date().toISOString(), data })); return true; } catch { return false; }
}
export function clearDraft(key: string): void {
  try { localStorage.removeItem(PREFIX + key); } catch { /* nothing kept */ }
}

/**
 * Keeps `value` while `dirty`. Writes shortly after typing stops, and at once when the page is hidden: phones close
 * tabs without warning. `key` null: nothing loaded yet.
 */
export function useKeep(key: string | null, value: unknown, dirty: boolean): { kept: boolean; forget: () => void } {
  const [kept, setKept] = useState(true);
  const last = useRef({ key, value, dirty });
  last.current = { key, value, dirty };
  const gone = useRef(false);
  useEffect(() => {
    if (!key) return;
    if (!dirty) { clearDraft(key); return; }
    const t = setTimeout(() => setKept(writeDraft(key, value)), 400);
    return () => clearTimeout(t);
  }, [key, value, dirty]);
  useEffect(() => {
    const flush = () => { const l = last.current; if (l.key && l.dirty && !gone.current) writeDraft(l.key, l.value); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      flush();
      removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
      unsaved.current = false;
    };
  }, []);
  // Leaving needs a question only when the text could not be kept.
  unsaved.current = dirty && !kept;
  return {
    kept,
    /** For a deleted document: drop the copy and write no more. */
    forget: () => { if (last.current.key) clearDraft(last.current.key); gone.current = true; },
  };
}
