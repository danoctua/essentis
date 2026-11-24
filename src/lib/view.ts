/** Turns stored content into what a page in one language shows. Pure; covered by tests. */
import { fmtDay, NB, ui, type Lang } from '../data/ui';
import type { Post } from './content';
import { postUrl } from './routes';

export interface PostView {
  id: string;
  slug: string;
  url: string;
  /** Language the shown text is in. Differs from the page language when there is no translation. */
  lang: Lang;
  foreign: boolean;
  title: string;
  /** Title in the page language, shown under a foreign title. */
  gloss?: string;
  dek?: string;
  body: string;
  date: Date;
  minutes: number;
  topics: Post['topics'];
  /** Same seed in both languages, so a post keeps its ornament. */
  seed: string;
  cover?: Post['cover'];
  meta: string;
}

export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function postView(p: Post, pageLang: Lang): PostView {
  const original = p.variants[p.originalLang];
  if (!original) throw new Error(`Post ${p.id} has no ${p.originalLang} variant`);
  const translated = p.variants[pageLang];
  const lang: Lang = pageLang === p.originalLang || translated?.body ? pageLang : p.originalLang;
  const v = lang === pageLang && translated ? translated : original;
  const foreign = lang !== pageLang;
  const body = v.body ?? '';
  const date = new Date(p.publishedAt);
  const minutes = readingMinutes(body);
  const t = ui[pageLang];
  return {
    id: p.id,
    slug: p.slug,
    url: postUrl(p.slug, pageLang),
    lang,
    foreign,
    title: v.title,
    gloss: foreign ? translated?.title : undefined,
    dek: v.dek,
    body,
    date,
    minutes,
    topics: p.topics,
    seed: original.title,
    cover: p.cover,
    meta: `${fmtDay(date, pageLang)}, ${foreign ? `${t.langName[lang]}, ` : ''}${minutes}${NB}${t.min}`,
  };
}
