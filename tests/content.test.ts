import { describe, it, expect } from 'vitest';
import { finish, pickSource, type Post, type RawContent } from '../src/lib/content';
import { parseServiceAccount } from '../src/lib/firebaseAdmin';
import { plain } from '../src/lib/firestore';
import { albums, noteTitle, postView, readingMinutes } from '../src/lib/view';
import { renderMarkdown } from '../src/lib/markdown';

describe('pickSource', () => {
  it('uses fixtures on the dev server without credentials', () => expect(pickSource({}, true)).toBe('fixtures'));
  it('uses Firestore on the dev server once credentials exist', () =>
    expect(pickSource({ FIREBASE_SERVICE_ACCOUNT: 'x' }, true)).toBe('firestore'));
  it('uses fixtures only when asked in a build', () => expect(pickSource({ USE_FIXTURES: '1' }, false)).toBe('fixtures'));
  it('fails a build without Firebase credentials instead of shipping samples', () =>
    expect(() => pickSource({ VERCEL: '1' }, false)).toThrow(/FIREBASE_SERVICE_ACCOUNT/));
  it('refuses fixtures in a production deploy', () =>
    expect(() => pickSource({ USE_FIXTURES: '1', VERCEL_ENV: 'production' }, false)).toThrow(/production/));
  it('uses Firestore when credentials exist', () => expect(pickSource({ FIREBASE_SERVICE_ACCOUNT: 'x' }, false)).toBe('firestore'));
});

const base: Post = {
  id: 'p', originalLang: 'en', slug: 's', topics: ['eng'], status: 'published',
  publishedAt: '2026-11-12T09:00:00Z', updatedAt: '2026-11-12T09:00:00Z',
  variants: { en: { title: 'English title', body: 'word '.repeat(400) }, be: { title: 'Беларуская назва' } },
};

describe('postView', () => {
  it('shows the original with a gloss when there is no translation', () => {
    const v = postView(base, 'be');
    expect(v).toMatchObject({ lang: 'en', foreign: true, title: 'English title', gloss: 'Беларуская назва', url: '/dopisy/s/' });
    expect(v.meta).toBe('12 лістапада, па-ангельску, 2 хв');
  });
  it('shows the translation when it has a body', () => {
    const p = { ...base, variants: { ...base.variants, be: { title: 'Назва', body: 'Тэкст' } } };
    expect(postView(p, 'be')).toMatchObject({ lang: 'be', foreign: false, title: 'Назва', gloss: undefined });
  });
  it('keeps the ornament seed in both languages', () =>
    expect(postView(base, 'be').seed).toBe(postView(base, 'en').seed));
  it('reading time ignores code blocks', () => expect(readingMinutes('a '.repeat(200) + '```\n' + 'x '.repeat(5000) + '\n```')).toBe(1));
});

describe('renderMarkdown', () => {
  it('drops images, headings and tables in Now mode', async () => {
    const html = await renderMarkdown('# H\n\nText ![a](x.png)\n\n| a |\n|---|\n| b |', { lang: 'be', now: true });
    expect(html).not.toMatch(/<img|<h1|<table/);
    expect(html).toContain('Text');
  });
  it('labels footnotes in the text language', async () => {
    const html = await renderMarkdown('A[^1]\n\n[^1]: note', { lang: 'be' });
    expect(html).toContain('Заўвагі');
  });
  it('links each footnote marker to its note, with no back-arrow', async () => {
    const html = await renderMarkdown('A[^1]\n\n[^1]: note', { lang: 'en' });
    const href = /href="#([^"]+)"[^>]*data-footnote-ref/.exec(html)?.[1];
    expect(href).toBeTruthy();
    expect(html).toContain(`id="${href}"`);
    expect(html).not.toMatch(/data-footnote-backref|↩/);
  });
  it('turns a fenced block into a labelled, focusable region with a caption', async () => {
    const html = await renderMarkdown('```py title="Зычныя"\ndef f(): pass\n```', { lang: 'be' });
    expect(html).toMatch(/<figure class="code-block"><div class="code" tabindex="0" role="region" aria-label="Код на Python">/);
    expect(html).toContain('<figcaption>Зычныя</figcaption>');
    expect(html).toContain('var(--code-token-keyword)');
  });
  it('escapes code in an unknown language and still labels it', async () => {
    const html = await renderMarkdown('```brainfun\n<script>x</script>\n```', { lang: 'en' });
    expect(html).toContain('aria-label="Code"');
    expect(html).not.toContain('<script>');
  });
  it('strips raw HTML', async () => {
    const html = await renderMarkdown('<script>alert(1)</script>ok', { lang: 'en' });
    expect(html).not.toContain('<script');
  });
});

const post = (over: Partial<Post>): Partial<Post> => ({
  id: 'a', originalLang: 'be', slug: 'a', topics: ['books'], status: 'published', publishedAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z', variants: { be: { title: 'Назва', body: 'Тэкст' } }, ...over,
});
const raw = (posts: Partial<Post>[], extra: Partial<RawContent> = {}): RawContent => ({ posts, work: [], projects: [], notes: [], ...extra });

describe('finish', () => {
  it('drops drafts from builds, keeps them on the dev server', () => {
    const r = raw([post({}), post({ id: 'd', slug: undefined, status: 'draft' })]);
    expect(finish(r, false).posts.map((p) => p.id)).toEqual(['a']);
    expect(finish(r, true).posts.map((p) => p.slug)).toEqual(['a', 'draft-d']);
  });
  it('sorts posts newest first', () => {
    const r = raw([post({}), post({ id: 'b', slug: 'b', publishedAt: '2026-11-05T00:00:00Z' })]);
    expect(finish(r, false).posts.map((p) => p.id)).toEqual(['b', 'a']);
  });
  it.each([
    ['a missing title', { variants: { be: { title: ' ' } } }, /no be title/],
    ['a bad slug', { slug: 'Łacinka' }, /slug/],
    ['a missing date', { publishedAt: undefined }, /publishedAt/],
    ['an unknown topic', { topics: ['cats'] as never }, /unknown topics cats/],
  ])('fails the build on a published post with %s', (_, over, msg) => {
    expect(() => finish(raw([post(over as Partial<Post>)]), false)).toThrow(msg);
  });
  it('fails the build on a duplicate slug', () =>
    expect(() => finish(raw([post({}), post({ id: 'b' })]), false)).toThrow(/also used by post a/));
  it('treats an empty Now note as missing', () => {
    expect(finish(raw([]), false).now).toBeNull();
    expect(finish(raw([], { now: { be: { body: ' ' } } }), false).now).toBeNull();
    expect(finish(raw([], { now: { be: { body: 'Цяпер' } } }), false).now?.be?.body).toBe('Цяпер');
  });
  it('skips incomplete Work entries and hidden notes', () => {
    const c = finish(raw([], {
      work: [{ id: 'w', role: 'Lead', company: 'X', from: 2020, order: 1 }, { id: 'e', order: 0 }],
      notes: [{ id: 'n', date: '2026-01-01T00:00:00Z', tgUrl: 'https://t.me/essentis/1', hidden: true }],
    }), false);
    expect(c.work.map((w) => w.id)).toEqual(['w']);
    expect(c.notes).toEqual([]);
  });
});

describe('Firestore helpers', () => {
  it('turns Timestamps into ISO strings at any depth', () => {
    const ts = { toDate: () => new Date('2026-11-12T09:00:00Z') };
    expect(plain({ a: ts, b: [{ c: ts }], d: 'x', e: null })).toEqual({ a: '2026-11-12T09:00:00.000Z', b: [{ c: '2026-11-12T09:00:00.000Z' }], d: 'x', e: null });
  });
  it('reads the service account as base64 or raw JSON', () => {
    const sa = { project_id: 'p', client_email: 'e', private_key: 'k' };
    expect(parseServiceAccount(Buffer.from(JSON.stringify(sa)).toString('base64'))).toMatchObject(sa);
    expect(parseServiceAccount(JSON.stringify(sa))).toMatchObject(sa);
  });
  it('explains a broken service account value', () => {
    expect(() => parseServiceAccount('not base64 json')).toThrow(/base64/);
    expect(() => parseServiceAccount(Buffer.from('{}').toString('base64'))).toThrow(/project_id/);
  });
});

describe('albums', () => {
  const note = (id: string, place?: string, n = 1) => ({ id, date: '2026-09-26T00:00:00Z', text: 'x', place, year: place ? 2026 : undefined, tgUrl: 'https://t.me/essentis/' + id, photos: Array.from({ length: n }, () => ({ key: 'k', w: 1, h: 1 })) });
  it('keeps placed albums and leaves memes and videos out', () => {
    const kept = albums([note('1'), note('2', 'Karkonosze', 10), note('3', 'Zakopane, Poland', 0), note('4', undefined, 5)]);
    expect(kept.map(noteTitle)).toEqual(['Karkonosze // 2026']);
  });
});
