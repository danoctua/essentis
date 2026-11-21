/**
 * Content source for the build. Production reads Firestore (src/lib/firestore.ts). Sample content in
 * fixtures/ is opt-in only (USE_FIXTURES=1, or the dev server without credentials), so a deploy with missing
 * credentials fails loudly instead of shipping sample posts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGS, TOPICS, type Lang, type Topic } from '../data/ui';

export interface Variant { title: string; dek?: string; body?: string }
export interface Media { key: string; w: number; h: number; alt?: string }
export interface Post {
  id: string;
  originalLang: Lang;
  slug: string;
  topics: Topic[];
  status: 'draft' | 'published';
  publishedAt: string;
  updatedAt: string;
  cover?: Media;
  variants: Partial<Record<Lang, Variant>>;
}
export interface LangDoc { body: string }
export interface NowPage { be?: LangDoc; en?: LangDoc; updatedAt: string }
/** bio: the two or three sentences on Home. intro: the About page's opening. meaning: "Why essentis". */
export interface AboutText { bio: string; intro: string; meaning: string; workSummary: string }
export interface AboutPage { be?: AboutText; en?: AboutText }
export interface UsesPage { be?: LangDoc; en?: LangDoc }
export interface Work { id: string; from: number; to?: number | null; role: string; company: string; line: Partial<Record<Lang, string>>; order: number }
export interface Project { id: string; name: string; url?: string; text: Partial<Record<Lang, string>>; order: number }
export interface Note { id: string; date: string; text: string; place?: string; year?: number; photos: Media[]; tgUrl: string; hidden?: boolean }

export interface Content {
  posts: Post[];
  /** null until the Now note is written. */
  now: NowPage | null;
  about: AboutPage;
  uses: UsesPage;
  work: Work[];
  projects: Project[];
  notes: Note[];
}

export type Source = 'fixtures' | 'firestore';

/** Decides where content comes from. Exported for tests. */
export function pickSource(env: Record<string, string | undefined>, dev: boolean): Source {
  // The dev server falls back to fixtures until Firebase credentials exist; builds never do.
  const fixtures = env.USE_FIXTURES === '1' || (dev && !env.FIREBASE_SERVICE_ACCOUNT);
  if (fixtures && env.VERCEL_ENV === 'production') {
    throw new Error('USE_FIXTURES is set in a production deploy. Remove it in Vercel so the site builds from Firestore.');
  }
  if (fixtures) return 'fixtures';
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. Add it in Vercel, or build locally with USE_FIXTURES=1 for sample content.');
  }
  return 'firestore';
}

/** What a source returns before checking: pages may be missing and fields loosely typed. */
export interface RawContent {
  posts: Partial<Post>[];
  now?: Partial<NowPage>;
  about?: AboutPage;
  uses?: UsesPage;
  work: Partial<Work>[];
  projects: Partial<Project>[];
  notes: Partial<Note>[];
}

function readFixtures(): RawContent {
  const read = <T>(name: string): T => JSON.parse(readFileSync(join(process.cwd(), 'fixtures', `${name}.json`), 'utf8'));
  return {
    posts: read('posts'),
    ...read<Pick<RawContent, 'now' | 'about' | 'uses'>>('pages'),
    work: read('work'),
    projects: read('projects'),
    notes: read('notes'),
  };
}

const validDate = (s: unknown): s is string => typeof s === 'string' && !Number.isNaN(Date.parse(s));
const hasText = (d?: { body?: string }) => !!d?.body?.trim();

/**
 * Checks posts that will be shown and puts everything in display order. A published post with a
 * missing title, slug or date fails the build, so the live site keeps its previous version instead
 * of showing a broken page. Drafts appear only on the dev server.
 */
export function finish(raw: RawContent, dev: boolean): Content {
  const posts: Post[] = [];
  const slugs = new Map<string, string>();
  for (const r of raw.posts) {
    const id = r.id ?? '?';
    if (r.status !== 'published' && !dev) continue;
    const fail = (why: string) => { throw new Error(`Post ${id}: ${why}. Fix it in /admin or the Firebase console, then publish again.`); };
    const p = { topics: [], variants: {}, ...r } as Post;
    if (!LANGS.includes(p.originalLang)) fail(`originalLang must be "be" or "en"`);
    if (!p.variants[p.originalLang]?.title?.trim()) fail(`no ${p.originalLang} title`);
    if (!p.slug && dev) p.slug = `draft-${id}`; // slugs are set on first publish
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug ?? '')) fail(`slug "${p.slug ?? ''}" must be lowercase ASCII words joined by hyphens`);
    if (!validDate(p.publishedAt)) fail('publishedAt is missing or not a date');
    if (!validDate(p.updatedAt)) p.updatedAt = p.publishedAt;
    const unknown = p.topics.filter((t) => !TOPICS.includes(t));
    if (unknown.length) fail(`unknown topics ${unknown.join(', ')} (known: ${TOPICS.join(', ')})`);
    if (slugs.has(p.slug)) fail(`slug "${p.slug}" is also used by post ${slugs.get(p.slug)}`);
    slugs.set(p.slug, id);
    posts.push(p);
  }
  const now = raw.now && (hasText(raw.now.be) || hasText(raw.now.en))
    ? { ...raw.now, updatedAt: validDate(raw.now.updatedAt) ? raw.now.updatedAt : new Date().toISOString() } as NowPage
    : null;
  const ordered = <T extends { order?: number }>(xs: T[]) => [...xs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    posts: posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    now,
    about: raw.about ?? {},
    uses: raw.uses ?? {},
    work: ordered(raw.work).filter((w): w is Work => !!w.role && !!w.company).map((w) => ({ ...w, line: w.line ?? {} })),
    projects: ordered(raw.projects).filter((p): p is Project => !!p.name).map((p) => ({ ...p, text: p.text ?? {} })),
    notes: raw.notes
      .filter((n): n is Note => !n.hidden && validDate(n.date) && !!n.tgUrl)
      .map((n) => ({ ...n, text: n.text ?? '', photos: n.photos ?? [] }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

let cached: Promise<Content> | undefined;

/** All content, loaded once per build. */
export function getContent(): Promise<Content> {
  cached ??= (async () => {
    const dev = import.meta.env.DEV;
    // .env values arrive on import.meta.env; Vercel's variables on process.env.
    const env: Record<string, string | undefined> = { ...import.meta.env, ...process.env };
    const source = pickSource(env, dev);
    const raw = source === 'firestore'
      ? await (await import('./firestore')).readFirestore(env.FIREBASE_SERVICE_ACCOUNT!)
      : readFixtures();
    return finish(raw, dev);
  })();
  return cached;
}
