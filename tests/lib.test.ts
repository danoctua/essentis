import { describe, it, expect } from 'vitest';
import { lat, slugify } from '../src/lib/lat';
import { ornament } from '../src/lib/ornament';
import { avatarTiles, markPaths, wovenBand } from '../src/lib/graphics';
import { postAlternates, routes } from '../src/lib/routes';

const pairs: [string, string][] = [
  ['Данііл', 'Daniił'], ['Лістапад', 'Listapad'], ['Беларусь', 'Biełaruś'],
  ['найчасьцей', 'najčaściej'], ['дасьледаваньняў', 'daśledavańniaŭ'], ['зь імі', 'ź imi'],
  ['Упершыню зьявіўся', 'Upieršyniu źjaviŭsia'], ["сям'я", 'siamja'], ['ІМЯ', 'IMIA'], ['ГІСТОРЫЯ', 'HISTORYJA'],
];
describe('lat', () => {
  for (const [a, b] of pairs) it(`${a} -> ${b}`, () => expect(lat(a)).toBe(b));
  it('slugify folds to ASCII', () => {
    expect(slugify('Чаму я перачытваю «Ладдзю роспачы»')).toMatch(/^[a-z0-9-]+$/);
    expect(slugify('Łacinka, кірыліца і поле slug')).toBe('lacinka-kirylica-i-pole-slug');
  });
});

describe('ornament', () => {
  it('is deterministic', () => expect(ornament('Daniił M.', 10)).toEqual(ornament('Daniił M.', 10)));
  it('differs by input', () => expect(ornament('a', 8).red).not.toBe(ornament('b', 8).red));
  it('viewBox size', () => expect(ornament('x', 10).viewBox).toBe('0 0 210 210'));
});

const tiles = (p: string) => (p.match(/M/g) ?? []).length;
describe('graphics', () => {
  it('mark has 8 rust and 4 ink tiles, centre empty', () => {
    const m = markPaths();
    expect(tiles(m.outer)).toBe(8);
    expect(tiles(m.inner)).toBe(4);
    expect(m.inner).not.toContain('M10.1 10.1');
  });
  it('avatar has the same twelve tiles', () => expect(tiles(avatarTiles())).toBe(12));
  it('band is 1200 x 136 and uses both colours', () => {
    const b = wovenBand();
    expect(b.viewBox).toBe('0 0 1200 136');
    expect(tiles(b.rust)).toBeGreaterThan(100);
    expect(tiles(b.ink)).toBeGreaterThan(50);
  });
});

describe('routes', () => {
  it('every route has both languages, English under /en/', () => {
    for (const r of Object.values(routes)) {
      expect(r.be.startsWith('/en/')).toBe(false);
      expect(r.en.startsWith('/en/')).toBe(true);
      expect(r.be.endsWith('/') && r.en.endsWith('/')).toBe(true);
    }
  });
  it('post alternates use different path words', () =>
    expect(postAlternates('x')).toEqual({ be: '/dopisy/x/', en: '/en/writing/x/' }));
});
