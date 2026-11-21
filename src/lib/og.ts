/**
 * Open Graph images, rendered at build time: satori lays out the card (fonts become paths), resvg
 * turns the SVG into a PNG. Light theme only: link previews sit on all kinds of backgrounds and the
 * linen card reads well on both.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { markPaths, wovenBand } from './graphics';
import { ornament } from './ornament';
import { site } from './site';
import type { Lang } from '../data/ui';

const W = 1200, H = 630;
// The woven band at three quarters of its site size: 200 columns of 8 units fill 1200 px.
const BAND_COLS = 200, BAND_H = Math.round(17 * 8 * (W / (BAND_COLS * 8)));
// Light theme values from design/tokens.json. satori cannot read CSS variables.
const C = { paper: '#efe9df', ink: '#221d18', muted: '#6e6458', rust: '#a5512a' };

type Font = { name: string; data: Buffer; weight: 400 | 500; style: 'normal' };
// satori reads WOFF but not WOFF2, and falls back between font names, not between files of one
// name. Each subset gets its own name and the family list below chains them.
const SUBSETS = ['latin', 'latin-ext', 'cyrillic'];
const FAMILY = SUBSETS.map((s) => `Plex-${s}`).join(', ');
let fonts: Font[] | undefined;
function loadFonts(): Font[] {
  const dir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-sans/files');
  return (fonts ??= ([400, 500] as const).flatMap((weight) => SUBSETS.map((subset) => ({
    name: `Plex-${subset}`, weight, style: 'normal' as const, data: readFileSync(join(dir, `ibm-plex-sans-${subset}-${weight}-normal.woff`)),
  }))));
}

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

function markSvg(): string {
  const { outer, inner } = markPaths();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${outer}" fill="${C.rust}"/><path d="${inner}" fill="${C.ink}"/></svg>`;
}
function ornamentSvg(seed: string): string {
  const o = ornament(seed, 8);
  const st = `fill="none" stroke-width="2.4" stroke-linecap="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${o.viewBox}"><path d="${o.red}" stroke="${C.rust}" ${st}/><path d="${o.black}" stroke="${C.ink}" ${st}/></svg>`;
}
function bandSvg(): string {
  const b = wovenBand(BAND_COLS);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.viewBox}"><path d="${b.rust}" fill="${C.rust}"/><path d="${b.ink}" fill="${C.ink}"/></svg>`;
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node =>
  ({ type, props: { style, children, ...extra } });

export interface OgCard {
  lang: Lang;
  title: string;
  /** Smaller line under the title: a gloss, or the site description. */
  sub?: string;
  /** Seeds the post ornament; omit for the site card, which shows the mark large instead. */
  seed?: string;
}

export async function ogPng({ lang, title, sub, seed }: OgCard): Promise<Buffer> {
  const size = title.length > 70 ? 52 : title.length > 40 ? 60 : 68;
  const art = seed ? ornamentSvg(seed) : markSvg();
  const tree = h('div', { width: W, height: H, display: 'flex', flexDirection: 'column', background: C.paper, color: C.ink, fontFamily: FAMILY }, [
    h('div', { display: 'flex', flex: 1, padding: '56px 72px 36px', gap: 56 }, [
      h('div', { display: 'flex', flexDirection: 'column', flex: 1 }, [
        h('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
          h('img', { width: 44, height: 44 }, undefined, { src: svgUri(markSvg()), width: 44, height: 44 }),
          h('div', { fontSize: 34, fontWeight: 500 }, 'essentis'),
        ]),
        h('div', { display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 18 }, [
          h('div', { fontSize: size, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.01em' }, title),
          ...(sub ? [h('div', { fontSize: 30, color: C.muted, lineHeight: 1.35 }, sub)] : []),
          h('div', { fontSize: 26, color: C.muted, marginTop: 8 }, seed ? `essentis.xyz · ${site.owner[lang]}` : 'essentis.xyz'),
        ]),
      ]),
      h('img', { width: 240, height: 240, marginTop: 8 }, undefined, { src: svgUri(art), width: 240, height: 240 }),
    ]),
    h('img', { width: W, height: BAND_H }, undefined, { src: svgUri(bandSvg()), width: W, height: BAND_H }),
  ]);
  const svg = await satori(tree as Parameters<typeof satori>[0], { width: W, height: H, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
