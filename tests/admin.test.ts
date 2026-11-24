import { readFileSync } from 'node:fs';
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
import { afterSave, byDate, glimpse, when } from '../src/admin/util';
import { link, prefix, wrap } from '../src/admin/format';
import { describe, expect, it } from 'vitest';
import { parseWebConfig } from '../src/admin/config';
import { makeSlug } from '../src/lib/slug';
import { SLUG_RE, postProblem } from '../src/lib/postCheck';
import { BASE_RE, mediaBase, parseMediaUrl } from '../src/lib/media';
import { renderMarkdown } from '../src/lib/markdown';
import { MEDIA_URL } from '../src/lib/site';

describe('parseWebConfig', () => {
  const want = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p' };
  it('reads one-line JSON', () => expect(parseWebConfig(JSON.stringify(want))).toMatchObject(want));
  it('reads the JavaScript pasted from the Firebase console', () =>
    expect(parseWebConfig(`const firebaseConfig = {\n  apiKey: "k",\n  authDomain: 'p.firebaseapp.com',\n  projectId: "p",\n};`)).toMatchObject(want));
  it('names the variable when it is missing or broken', () => {
    expect(() => parseWebConfig('')).toThrow(/PUBLIC_FIREBASE_CONFIG/);
    expect(() => parseWebConfig('hello')).toThrow(/PUBLIC_FIREBASE_CONFIG/);
    expect(() => parseWebConfig('{"apiKey":"k"}')).toThrow(/projectId/);
  });
});

describe('makeSlug', () => {
  it.each(['«»…', '🙂🙂', '???', '   ', ''])('never returns an empty slug (%j)', (t) => expect(makeSlug(t, [])).toBe('dopis'));
  it('makes Łacinka ASCII slugs that pass the build check', () => {
    for (const t of ['Ўсё пра «Łacinku» і код', 'C++ і Rust', '2026: год', 'Šč ŭ ł']) expect(makeSlug(t, [])).toMatch(SLUG_RE);
  });
  it('adds a number when the slug is taken', () => {
    expect(makeSlug('Кнігі', ['knihi'])).toBe('knihi-2');
    expect(makeSlug('Кнігі', ['knihi', 'knihi-2'])).toBe('knihi-3');
  });
  it('cuts long titles at a word boundary', () => {
    const s = makeSlug('слова '.repeat(40), []);
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s).toMatch(SLUG_RE);
  });
});

describe('postProblem', () => {
  it('accepts a complete post and names the first problem otherwise', () => {
    const p = { originalLang: 'be' as const, slug: 'a', publishedAt: '2026-11-01T00:00:00Z', topics: [], variants: { be: { title: 'A' } } };
    expect(postProblem(p)).toBeNull();
    expect(postProblem({ ...p, slug: undefined })).toMatch(/slug/);
  });
});

describe('media', () => {
  it('builds and parses keys with the size in the name', () => {
    const base = mediaBase('abc', '0123456789abcdef', 2400, 1600);
    expect(base).toMatch(BASE_RE);
    expect(parseMediaUrl(`${MEDIA_URL}/${base}-800.webp`, MEDIA_URL)).toEqual({ base, w: 2400, h: 1600 });
  });
  it('parses photos from the Telegram sync, but never signs uploads for them', () => {
    const base = 'notes/142/5881953129601896279-2560x2116';
    expect(parseMediaUrl(`${MEDIA_URL}/${base}-1600.webp`, MEDIA_URL)).toEqual({ base, w: 2560, h: 2116 });
    expect(base).not.toMatch(BASE_RE);
  });
  it('ignores other images and malformed keys', () => {
    expect(parseMediaUrl('https://example.com/a-1x1-800.webp', MEDIA_URL)).toBeNull();
    expect(parseMediaUrl(`${MEDIA_URL}/../secret-1x1-800.webp`, MEDIA_URL)).toBeNull();
  });
  it('gives our images srcset, size and lazy loading in rendered Markdown', async () => {
    const base = mediaBase('abc', '0123456789abcdef', 3000, 2000);
    const html = await renderMarkdown(`![A lake](${MEDIA_URL}/${base}-1600.webp)`, { lang: 'en' });
    expect(html).toContain(`src="${MEDIA_URL}/${base}-800.webp"`);
    expect(html).toContain(`${base}-400.webp 400w`);
    expect(html).toMatch(/width="1600" height="1067"/);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="A lake"');
  });
  it('does not upscale small images in srcset', async () => {
    const base = mediaBase('abc', '0123456789abcdef', 600, 300);
    const html = await renderMarkdown(`![](${MEDIA_URL}/${base}-1600.webp)`, { lang: 'en' });
    expect(html).toMatch(/width="600" height="300"/);
    expect(html).not.toContain('1600w');
  });
});

it('lists undated drafts first, then posts by their own date, whenever they were edited', () => {
  const p = (id: string, publishedAt?: string, updatedAt = '2026-11-24') => ({ id, publishedAt, updatedAt });
  const ids = [p('old', '2024-02-12'), p('new', '2026-02-13', '2026-01-01'), p('draft', undefined, '2026-01-02'), p('mid', '2025-05-23'), p('draft2')].sort(byDate).map((x) => x.id);
  expect(ids).toEqual(['draft2', 'draft', 'new', 'mid', 'old']);
});

describe('editing while something is running', () => {
  const sent = { status: 'draft', title: 'a' } as { status: string; title: string; slug?: string; publishedAt?: string; updatedAt?: string };
  const done = { ...sent, status: 'published', slug: 'a', publishedAt: '2026-01-01', updatedAt: '2026-01-02' };
  it('takes the saved post when nothing changed meanwhile', () => expect(afterSave(sent, sent, done)).toBe(done));
  it('keeps what was typed while the save ran', () =>
    expect(afterSave({ ...sent, title: 'ab' }, sent, done)).toEqual({ ...done, title: 'ab' }));
  it('never writes the value back into the open editor (that loop froze the page)', () => {
    const src = readFileSync(new URL('../src/admin/MdEditor.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/\[value\]/);
  });
});

describe('formatting commands', () => {
  // "|" marks the ends of the selection, before and after.
  const run = (marked: string, f: (s: EditorState) => TransactionSpec): string => {
    const a = marked.indexOf('|'), b = marked.lastIndexOf('|');
    const doc = marked.replaceAll('|', '');
    const state = EditorState.create({ doc, selection: EditorSelection.range(a, a === b ? a : b - 1) });
    const next = state.update(f(state)).state, r = next.selection.main, t = next.doc.toString();
    return r.empty ? `${t.slice(0, r.from)}|${t.slice(r.from)}` : `${t.slice(0, r.from)}|${t.slice(r.from, r.to)}|${t.slice(r.to)}`;
  };
  const bold = (s: EditorState) => wrap(s, '**'), italic = (s: EditorState) => wrap(s, '*');
  it.each([
    ['a |b| c', bold, 'a **|b|** c'], ['a **|b|** c', bold, 'a |b| c'], ['a |**b**| c', bold, 'a |b| c'], ['a | c', bold, 'a **|** c'],
    ['a **|b|** c', italic, 'a ***|b|*** c'], ['a *|b|* c', italic, 'a |b| c'], ['a |**b**| c', italic, 'a *|**b**|* c'],
  ] as const)('wrap %s', (from, f, to) => expect(run(from, f)).toBe(to));
  it.each([
    ['a|b', '## ', '## a|b'], ['## a|b', '## ', 'a|b'], ['> a|b', '- ', '- a|b'], ['|a\n\nb|', '- ', '- |a\n\n- b|'], ['- |a\n- b|', '- ', '|a\nb|'], ['|', '> ', '> |'],
  ] as const)('prefix %s with %s', (from, p, to) => expect(run(from, (s) => prefix(s, p))).toBe(to));
  it.each([
    ['see |this| now', 'see [this](|https://|) now'], ['see | now', 'see [|](https://) now'], ['|https://x.by/a|', '[|](https://x.by/a)'],
  ])('link %s', (from, to) => expect(run(from, link)).toBe(to));
});

it('writes dates in Belarusian whatever the browser knows', () => {
  expect(when('2026-11-24T12:05:00Z').replace(/\u00a0/g, ' ')).toMatch(/^24 лістапада 2026, \d\d:05$/);
  expect(when()).toBe('');
});
it('shows the first words of a collapsed text without marks', () => {
  expect(glimpse('_на **бальнічным**_ [тут](https://x.by)\n\n![](a.webp)')).toBe('на бальнічным тут');
  expect(glimpse('слова '.repeat(30), 20)).toBe('слова слова слова…');
});
