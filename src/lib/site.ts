/** Static site configuration. Content lives in Firestore; only this stays in the repo. */
export const site = {
  name: 'essentis',
  url: 'https://essentis.xyz',
  /** Never the surname, anywhere. */
  owner: { be: 'Данііл М.', en: 'Daniił M.' },
  // Placeholder: may move to an essentis.xyz address. Set to null to hide it everywhere.
  email: 'danoctua@gmail.com' as string | null,
  channelUrl: 'https://t.me/essentis',
  links: [
    { id: 'channel', label: { be: 'Канал essentis', en: 'essentis channel' }, note: 't.me/essentis', href: 'https://t.me/essentis' },
    { id: 'tg', label: { be: 'Telegram', en: 'Telegram' }, note: '@danoctua', href: 'https://t.me/danoctua' },
    { id: 'gh', label: { be: 'GitHub', en: 'GitHub' }, note: 'danoctua', href: 'https://github.com/danoctua' },
    { id: 'li', label: { be: 'LinkedIn', en: 'LinkedIn' }, note: 'danoctua', href: 'https://www.linkedin.com/in/danoctua' },
  ],
};

/** Public base URL of the R2 bucket. */
export const MEDIA_URL = (import.meta.env.PUBLIC_MEDIA_URL as string | undefined) ?? 'https://media.essentis.xyz';

/**
 * Media are stored as `<base>-<width>.webp` (widths 400, 800, 1600). Fixture keys
 * (`fixture/…`) have no file behind them and return null, so pages show a placeholder.
 */
export function mediaUrl(key: string, width: 400 | 800 | 1600): string | null {
  if (key.startsWith('fixture/')) return null;
  return `${MEDIA_URL}/${key}-${width}.webp`;
}
