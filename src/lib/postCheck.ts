/**
 * What a post needs before it can be published. Used by the build (a failing post stops the
 * deploy) and by the admin (so it never publishes what the build would reject). No Node imports:
 * the admin runs this in the browser.
 */
import { LANGS, TOPICS } from '../data/ui';
import type { Post } from './content';

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const validDate = (s: unknown): s is string => typeof s === 'string' && !Number.isNaN(Date.parse(s));

/** The first thing that would stop this post from being published, or null. */
export function postProblem(p: Partial<Post>): string | null {
  if (!p.originalLang || !LANGS.includes(p.originalLang)) return 'originalLang must be "be" or "en"';
  if (!p.variants?.[p.originalLang]?.title?.trim()) return `no ${p.originalLang} title`;
  if (!SLUG_RE.test(p.slug ?? '')) return `slug "${p.slug ?? ''}" must be lowercase ASCII words joined by hyphens`;
  if (!validDate(p.publishedAt)) return 'publishedAt is missing or not a date';
  const unknown = (p.topics ?? []).filter((t) => !TOPICS.includes(t));
  if (unknown.length) return `unknown topics ${unknown.join(', ')} (known: ${TOPICS.join(', ')})`;
  return null;
}
