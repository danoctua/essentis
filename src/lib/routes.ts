import type { Lang } from '../data/ui';

/**
 * One table for every URL. Belarusian and English use different path words
 * (/dopisy/ and /en/writing/), so never build an alternate by swapping a prefix.
 */
export const routes = {
  home: { be: '/', en: '/en/' },
  writing: { be: '/dopisy/', en: '/en/writing/' },
  photos: { be: '/fota/', en: '/en/photos/' },
  about: { be: '/pra-mianie/', en: '/en/about/' },
} as const;
export type RouteName = keyof typeof routes;
export type Alternates = Record<Lang, string>;

export const postUrl = (slug: string, lang: Lang) => `${routes.writing[lang]}${slug}/`;
export const albumUrl = (slug: string, lang: Lang) => `${routes.photos[lang]}${slug}/`;
export const albumAlternates = (slug: string): Alternates => ({ be: albumUrl(slug, 'be'), en: albumUrl(slug, 'en') });
export const postAlternates = (slug: string): Alternates => ({ be: postUrl(slug, 'be'), en: postUrl(slug, 'en') });
