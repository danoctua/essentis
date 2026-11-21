/**
 * Content source for the build. Production reads Firestore (phase 2). Sample content in
 * fixtures/ is opt-in only (USE_FIXTURES=1, or the dev server without credentials), so a deploy with missing
 * credentials fails loudly instead of shipping sample posts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lang, Topic } from '../data/ui';

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
  now: NowPage;
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

function readFixtures(): Content {
  const read = <T>(name: string): T => JSON.parse(readFileSync(join(process.cwd(), 'fixtures', `${name}.json`), 'utf8'));
  return {
    posts: read('posts'),
    ...read<Pick<Content, 'now' | 'about' | 'uses'>>('pages'),
    work: read('work'),
    projects: read('projects'),
    notes: read('notes'),
  };
}

let cached: Promise<Content> | undefined;

/** All content, loaded once per build. Drafts and hidden notes are removed outside the dev server. */
export function getContent(): Promise<Content> {
  cached ??= (async () => {
    const dev = import.meta.env.DEV;
    // .env values arrive on import.meta.env; Vercel's variables on process.env.
    const source = pickSource({ ...import.meta.env, ...process.env }, dev);
    if (source === 'firestore') throw new Error('The Firestore loader arrives in phase 2. Build with USE_FIXTURES=1 for now.');
    const c = readFixtures();
    return {
      ...c,
      posts: c.posts
        .filter((p) => dev || p.status === 'published')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      work: [...c.work].sort((a, b) => a.order - b.order),
      projects: [...c.projects].sort((a, b) => a.order - b.order),
      notes: c.notes.filter((n) => !n.hidden).sort((a, b) => b.date.localeCompare(a.date)),
    };
  })();
  return cached;
}
