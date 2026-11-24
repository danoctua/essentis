import { describe, expect, it } from 'vitest';
import { albums, captionParagraphs } from '../src/lib/albums';
import { ui } from '../src/data/ui';
import type { Note } from '../src/lib/content';

const note = (id: string, place?: string, year?: number, n = 1, text = ''): Note => ({
  id, date: `2026-01-01T00:00:${id.padStart(2, '0')}Z`, text, place, year, tgUrl: `https://t.me/essentis/${id}`,
  photos: Array.from({ length: n }, (_, i) => ({ key: `notes/${id}/${i}-3x4`, w: 3, h: 4 })),
});

describe('albums', () => {
  it('leaves out memes, unplaced posts and video-only posts', () => {
    const got = albums([note('1'), note('2', 'Karkonosze', 2026, 10), note('3', 'Zakopane, Poland', 2021, 0), note('4', undefined, undefined, 5)]);
    expect(got.map((a) => [a.slug, a.title, a.count])).toEqual([['karkonosze-2026', 'Karkonosze // 2026', 10]]);
  });
  it('joins posts about one place and year, oldest first, each with its own caption', () => {
    const [a, ...rest] = albums([note('40', 'Venice, Italy', 2023, 1, 'Banksy. \n\nVenice, Italy // 2023'), note('19', 'Venice, Italy', 2023, 6, 'Bring them to life. \n\nVenice, Italy // 2023')]);
    expect(rest).toEqual([]);
    expect([a.slug, a.count, a.cover.key]).toEqual(['venice-italy-2023', 7, 'notes/19/0-3x4']);
    expect(a.parts.map((p) => p.caption)).toEqual([[['Bring them to life.']], [['Banksy.']]]);
  });
  it('orders by year, then newest post; another year is another album', () => {
    expect(albums([note('1', 'Wien', 2025), note('2', 'Zug', 2022), note('3', 'Venice', 2023), note('4', 'Wien', 2026), note('5', 'Graz', 2025)]).map((a) => a.slug))
      .toEqual(['wien-2026', 'graz-2025', 'wien-2025', 'venice-2023', 'zug-2022']);
  });
  it('makes ASCII addresses from any alphabet, and never an empty one', () => {
    expect(albums([note('1', 'Österreich, Wien', 2025)])[0].slug).toBe('osterreich-wien-2025');
    expect(albums([note('1', 'Нясьвіж', 2025)])[0].slug).toMatch(/^[a-z-]+-2025$/);
    expect(albums([note('7', '🌳', 2025)])[0].slug).toBe('7-2025');
  });
  it('knows which language a caption is in', () => {
    expect(albums([note('1', 'Lagow', 2026, 1, 'Ну і цікава\n\nLagow // 2026')])[0].parts[0].lang).toBe('be');
    expect(albums([note('1', 'Zug', 2022, 1, 'Mountain View.\n\nZug // 2022')])[0].parts[0].lang).toBe('en');
  });
});

describe('captionParagraphs', () => {
  it('drops the place line and zero-width spaces, keeps verse lines and joined emoji', () => {
    expect(captionParagraphs('На лугі\nКрасавік\n\n\u200bАле 👩\u200d💻\n\n\nPoland // 2025')).toEqual([['На лугі', 'Красавік'], ['Але 👩\u200d💻']]);
    expect(captionParagraphs('Karkonosze // 2026')).toEqual([]);
  });
});

it('counts photos in both languages', () => {
  expect([ui.en.photos(1), ui.en.photos(10), ui.be.photos(1)]).toEqual(['1\u00a0photo', '10\u00a0photos', '1\u00a0фота']);
});
