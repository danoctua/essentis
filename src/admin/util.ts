import { fmtDate } from '../data/ui';

/** Set by an editor while it has unsaved text that could not be kept in the browser; navigation asks before leaving. */
export const unsaved = { current: false };

/** "21 лістапада 2026, 23:40" in the browser's time zone. */
export function when(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso), local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  // Not toLocaleString('be'): some browsers have no Belarusian and answer in English.
  return `${fmtDate(local, 'be')}, ${local.toISOString().slice(11, 16)}`;
}

/** The first words of a text, without Markdown marks, for a collapsed section. */
export function glimpse(md: string, max = 70): string {
  const t = md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>#]+/g, '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t;
}

/** Goes to another hash without loading anything again: the editor on screen stays as it is. */
export function replaceHash(hash: string): void {
  history.replaceState(null, '', hash);
  dispatchEvent(new Event('admin:hash'));
}

/** Posts without a date first (being written), then newest first by the post's own date, as on the site. */
export function byDate(a: { publishedAt?: string; updatedAt?: string }, b: { publishedAt?: string; updatedAt?: string }): number {
  if (!a.publishedAt !== !b.publishedAt) return a.publishedAt ? 1 : -1;
  const key = a.publishedAt ? 'publishedAt' : 'updatedAt';
  return (b[key] ?? '').localeCompare(a[key] ?? '');
}

/** The post to show once `done` is saved: whatever was typed while the save ran (`now` is no longer `sent`) stays. */
export function afterSave<P extends { status: string; slug?: string; publishedAt?: string; updatedAt?: string }>(now: P, sent: P, done: P): P {
  return now === sent ? done : { ...now, status: done.status, slug: done.slug, publishedAt: now.publishedAt ?? done.publishedAt, updatedAt: done.updatedAt };
}

/** Ctrl+S / Cmd+S while mounted. */
export function onSaveKey(fn: () => void) {
  const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); fn(); } };
  addEventListener('keydown', h);
  return () => removeEventListener('keydown', h);
}
