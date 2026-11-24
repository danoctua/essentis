/** Set by an editor while it has unsaved changes; navigation asks before leaving. */
export const unsaved = { current: false };

/** "21 лістапада 2026, 23:40" in the browser's time zone. */
export const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('be', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Posts without a date first (being written), then newest first by the post's own date, as on the site. */
export function byDate(a: { publishedAt?: string; updatedAt?: string }, b: { publishedAt?: string; updatedAt?: string }): number {
  if (!a.publishedAt !== !b.publishedAt) return a.publishedAt ? 1 : -1;
  const key = a.publishedAt ? 'publishedAt' : 'updatedAt';
  return (b[key] ?? '').localeCompare(a[key] ?? '');
}

/** Ctrl+S / Cmd+S while mounted. */
export function onSaveKey(fn: () => void) {
  const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); fn(); } };
  addEventListener('keydown', h);
  return () => removeEventListener('keydown', h);
}
