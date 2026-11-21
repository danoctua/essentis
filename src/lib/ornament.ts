/** Deterministic cross-stitch ornament. Port of the handoff algorithm; keep stable. */
const fnv = (s: string) => { let h = 2166136261 >>> 0; for (const ch of s) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619) >>> 0; } return h; };
const rng = (seed: number) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
export const cross = (cx: number, cy: number, u: number) => {
  const x0 = cx * u, y0 = cy * u, a = +(u * 0.16).toFixed(2), b = +(u * 0.84).toFixed(2);
  return `M${x0 + a} ${y0 + a}L${x0 + b} ${y0 + b}M${x0 + b} ${y0 + a}L${x0 + a} ${y0 + b}`;
};

export interface Ornament { red: string; black: string; viewBox: string; size: number }

export function ornament(str: string, R: number): Ornament {
  const r = rng(fnv(str));
  const cType = Math.floor(r() * 3);
  const cSize = cType === 1 ? 2 : (r() < 0.5 ? 1 : 2);
  const rings: { k: number; hook: boolean; dot: boolean }[] = [];
  let k = cSize + 2;
  while (k <= R) { rings.push({ k, hook: k + 2 <= R && r() < 0.55, dot: k >= 5 && r() < 0.3 }); k += 2 + Math.floor(r() * 3); }
  const star = rings.length > 0 && r() < 0.55 ? Math.max(2, Math.ceil(rings[0].k * 0.7)) : 0;
  const branch = rings.length > 1 && r() < 0.5;
  const corners = R >= 7 && r() < 0.8;
  const pool = ['c', ...rings.map((_, i) => 'r' + i), ...(star ? ['s'] : []), ...(corners ? ['k'] : [])];
  const blackId = pool[Math.floor(r() * pool.length)];
  const last = rings.length ? rings[rings.length - 1].k : cSize;
  const col = (id: string) => (id === blackId ? 2 : 1);
  const at = (ax: number, ay: number): number => {
    const d = ax + ay, m = Math.max(ax, ay);
    if (cType === 0 && d <= cSize) return col('c');
    if (cType === 1 && d <= 2 && d !== 1) return col('c');
    if (cType === 2 && (ax === 0 || ay === 0) && d <= cSize) return col('c');
    for (let i = 0; i < rings.length; i++) {
      const g = rings[i];
      if (d === g.k && (!g.dot || ax % 2 === 0)) return col('r' + i);
      if (g.hook && ((ax === 0 && ay === g.k + 1) || (ay === 0 && ax === g.k + 1) || (ax === 1 && ay === g.k + 2) || (ay === 1 && ax === g.k + 2))) return col('r' + i);
    }
    if (star && m === star && d > rings[0].k) return col('s');
    if (branch && ax === ay && d > rings[0].k && d < last) return 1;
    if (corners) { const dd = Math.abs(ax - (R - 2)) + Math.abs(ay - (R - 2)); if (dd === 1) return col('k'); if (dd === 0) return 2; }
    return 0;
  };
  let red = '', black = '';
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const on = at(Math.abs(x), Math.abs(y));
    if (on) { const p = cross(x + R, y + R, 10); if (on === 1) red += p; else black += p; }
  }
  const n = (2 * R + 1) * 10;
  return { red, black, viewBox: `0 0 ${n} ${n}`, size: n };
}
