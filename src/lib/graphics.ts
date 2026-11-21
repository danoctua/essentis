/**
 * The brand's tile graphics as SVG path data. Geometry is specified in design/brand-book.md
 * ("The mark", "Ornament"); keep these in step with it.
 */
const f2 = (n: number) => +n.toFixed(2);
const square = (x: number, y: number, s: number) => `M${f2(x)} ${f2(y)}h${s}v${s}h-${s}Z`;

/** Distance of cell (i, j) from the centre of a 5x5 grid. */
const dist = (i: number, j: number) => Math.abs(i - 2) + Math.abs(j - 2);

/** Мазаіка: 5x5 grid at 4.8 pitch in a 24 box. Outer ring (d=2) rust, inner ring (d=1) ink, centre empty. */
export function markPaths(tile = 3.8): { outer: string; inner: string } {
  const gap = (4.8 - tile) / 2;
  let outer = '', inner = '';
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const d = dist(i, j);
    const p = square(i * 4.8 + gap, j * 4.8 + gap, tile);
    if (d === 2) outer += p; else if (d === 1) inner += p;
  }
  return { outer, inner };
}

/** The mark's twelve tiles, scaled into the middle of a 24-unit disc (for the avatar). */
export function avatarTiles(): string {
  let p = '';
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const d = dist(i, j);
    if (d === 1 || d === 2) p += square(4 + i * 3.2 + 0.32, 4 + j * 3.2 + 0.32, 2.56);
  }
  return p;
}

/** Woven band: rushnik-like strip of square tiles at an 8-unit pitch. */
export function wovenBand(cols = 150): { rust: string; ink: string; viewBox: string } {
  const P = 8, T = 6.4, ROWS = 17;
  let rust = '', ink = '';
  const put = (c: number, r: number, colour: 1 | 2) => {
    const q = square(c * P + 0.8, r * P + 0.8, T);
    if (colour === 1) rust += q; else ink += q;
  };
  for (let c = 0; c < cols; c += 2) { put(c, 0, 1); put(c, ROWS - 1, 1); }
  for (let c = 1; c < cols; c += 4) { put(c, 2, 2); put(c, ROWS - 3, 2); }
  for (let m = 0; m * 16 < cols + 16; m++) {
    const cx = m * 16 + 7, cy = 8, kind = m % 2;
    for (let r = 3; r <= ROWS - 4; r++) for (let c = cx - 6; c <= cx + 6; c++) {
      if (c < 0 || c >= cols) continue;
      const ax = Math.abs(c - cx), ay = Math.abs(r - cy), d = ax + ay;
      if (kind === 0) {
        if (d === 5 || d === 1) put(c, r, 1); else if (d === 3) put(c, r, 2);
      } else if (d === 4 && (ax === 0 || ay === 0 || ax === ay)) put(c, r, 1);
      else if (d === 2) put(c, r, 2);
      else if (d === 0) put(c, r, 1);
    }
    const lx = m * 16 + 15;
    if (lx < cols) { put(lx, cy, 2); put(lx, cy - 1, 1); put(lx, cy + 1, 1); }
  }
  return { rust, ink, viewBox: `0 0 ${cols * P} ${ROWS * P}` };
}

/** Stitched divider: a row of small rhombus outlines, 16 units apart, 10 units tall. */
export function dividerPath(width = 1200): string {
  let p = '';
  for (let x = 6; x + 4 <= width; x += 16) p += `M${x} 1.5L${x + 3.5} 5L${x} 8.5L${x - 3.5} 5Z`;
  return p;
}
