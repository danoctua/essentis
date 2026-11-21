import { describe, it, expect } from 'vitest';
import { pickSource, type Post } from '../src/lib/content';
import { postView, readingMinutes } from '../src/lib/view';
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
  it('strips raw HTML', async () => {
    const html = await renderMarkdown('<script>alert(1)</script>ok', { lang: 'en' });
    expect(html).not.toContain('<script');
  });
});
