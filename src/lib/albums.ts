/**
 * Photo albums from channel posts with a "Place // Year" caption. Posts about the same place and
 * year are one album, each post a part of it with its own caption. Pure; covered by tests.
 */
import type { Media, Note } from './content';
import { slugify } from './lat';
import type { Lang } from '../data/ui';

export interface AlbumPart {
  id: string;
  /** Paragraphs of the caption without its "Place // Year" line; each holds its lines. */
  caption: string[][];
  lang: Lang;
  photos: Media[];
  tgUrl: string;
}
export interface Album { slug: string; place: string; year: number; title: string; count: number; cover: Media; parts: AlbumPart[]; date: string }

const PLACE_LINE = /^\S.*?\s*\/\/\s*(?:19|20)\d{2}$/;

export function captionParagraphs(text: string): string[][] {
  // Telegram captions carry stray zero-width spaces. U+200D stays: it joins emoji.
  const lines = text.replace(/​/g, '').split('\n').map((l) => l.trim());
  const last = lines.findLastIndex((l) => PLACE_LINE.test(l));
  if (last >= 0) lines.splice(last, 1);
  const out: string[][] = [[]];
  for (const l of lines) l ? out.at(-1)!.push(l) : out.push([]);
  return out.filter((p) => p.length > 0);
}

export function albums(notes: Note[]): Album[] {
  const bySlug = new Map<string, Note[]>();
  for (const n of notes) {
    if (!n.place || !n.year || n.photos.length === 0) continue;
    const slug = `${slugify(n.place) || n.id}-${n.year}`;
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), n]);
  }
  return [...bySlug]
    .map(([slug, ns]): Album => {
      const posts = [...ns].sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id));
      const { place, year } = posts[0] as { place: string; year: number };
      return {
        slug, place, year, title: `${place} // ${year}`,
        count: posts.reduce((n, p) => n + p.photos.length, 0),
        cover: posts[0].photos[0],
        date: posts.at(-1)!.date,
        parts: posts.map((p) => ({
          id: p.id, caption: captionParagraphs(p.text), lang: /\p{Script=Cyrillic}/u.test(p.text) ? 'be' : 'en', photos: p.photos, tgUrl: p.tgUrl,
        })),
      };
    })
    .sort((a, b) => b.year - a.year || b.date.localeCompare(a.date) || Number(b.parts[0].id) - Number(a.parts[0].id));
}
