"""Assemble essentis page drafts (.dc.html) from shared pieces."""
import json, pathlib

OUT = pathlib.Path('/tmp/claude-1000/-home-danoctua-Projects/5bbe4efb-f5a5-4a94-ab79-a8846f7de8f8/scratchpad/artifact-files/9eab14b5-3920-4cd4-b582-324b7fc8c2ec/project')

CSS = r"""
body{margin:0}
.es{--paper:#efe9df;--raised:#f6f2ea;--ink:#221d18;--muted:#6e6458;--rust:#a5512a;--line:#d8cfc1;--mark-in:#221d18;--on-rust:#efe9df}
.es.t-dark{--paper:#1a1714;--raised:#231f1b;--ink:#ece4d7;--muted:#a89c8c;--rust:#e08a5c;--line:#36302a;--mark-in:#ece4d7;--on-rust:#1a1714}
@media (prefers-color-scheme: dark){.es.t-auto{--paper:#1a1714;--raised:#231f1b;--ink:#ece4d7;--muted:#a89c8c;--rust:#e08a5c;--line:#36302a;--mark-in:#ece4d7;--on-rust:#1a1714}}
.es{background:var(--paper);color:var(--ink);font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif;font-size:17px;line-height:1.65;min-height:100vh}
.es a{color:inherit;text-decoration-color:var(--rust);text-decoration-thickness:1px;text-underline-offset:4px}
.es a:hover{color:var(--rust)}
.es button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.es :focus-visible{outline:2px solid var(--rust);outline-offset:3px;border-radius:2px}
.es .skip{position:absolute;left:-9999px;top:8px}
.es .skip:focus{left:16px;background:var(--ink);color:var(--paper);padding:10px 14px;z-index:2}
.es .wrap{max-width:1120px;margin:0 auto;padding-left:clamp(16px,3vw,32px);padding-right:clamp(16px,3vw,32px);box-sizing:border-box}
.es .top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 24px;padding-top:20px;padding-bottom:20px}
.es .brand{display:inline-flex;align-items:center;gap:10px;min-height:44px;text-decoration:none;font-size:18px;font-weight:500}
.es .navs{display:flex;align-items:center;flex-wrap:wrap;gap:0 24px}
.es .nav{display:flex;gap:0 20px;list-style:none;margin:0;padding:0;font-size:15px}
.es .nav a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none;color:var(--muted)}
.es .nav a:hover{color:var(--ink)}
.es .nav a[aria-current="page"]{color:var(--ink);text-decoration:underline;text-decoration-color:var(--rust);text-underline-offset:6px}
.es .langs{display:flex;gap:4px;font-size:15px}
.es .langs button{min-height:44px;min-width:44px;color:var(--muted)}
.es .langs button[aria-pressed="true"]{color:var(--ink);text-decoration:underline;text-decoration-color:var(--rust);text-underline-offset:6px}
.es .rows{list-style:none;margin:0;padding:0}
.es .row{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;align-items:start;padding:16px 0;border-top:1px solid var(--line);text-decoration:none}
.es .row:hover .ttl{color:var(--rust)}
.es .ttl{display:block;font-size:18px;font-weight:500;line-height:1.4}
.es .gloss{display:block;margin-top:2px;font-size:15px;line-height:1.45;color:var(--muted)}
.es .meta{display:block;margin-top:4px;font-size:15px;line-height:1.45;color:var(--muted)}
.es .h2{margin:0;font-size:22px;font-weight:500;line-height:1.35}
.es .sechead{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:8px}
.es .sechead a{font-size:15px;color:var(--muted)}
.es .muted{color:var(--muted)}
.es .divider{display:block;width:100%;height:10px}
.es .foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;padding-top:24px;padding-bottom:40px;font-size:15px;color:var(--muted)}
.es .foot ul{display:flex;flex-wrap:wrap;gap:0 20px;list-style:none;margin:0;padding:0}
.es .foot a{display:inline-flex;align-items:center;min-height:44px}
"""

JS_LIB = r"""
    const st = this.state || {};
    const theme = this.props.theme || 'light';
    const lang = st.lang || 'be';
    const f2 = (n) => +n.toFixed(2);
    const markCells = (keep) => { let p = ''; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const d = Math.abs(i - 2) + Math.abs(j - 2); if (keep(d)) { const x = i * 4.8 + 0.5, y = j * 4.8 + 0.5; p += 'M' + f2(x) + ' ' + f2(y) + 'h3.8v3.8h-3.8Z'; } } return p; };
    const mark = { outer: markCells((d) => d === 2), inner: markCells((d) => d === 1) };
    const dia = (cx, cy, r) => 'M' + cx + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + cy + 'L' + cx + ' ' + (cy + r) + 'L' + (cx - r) + ' ' + cy + 'Z';
    let divider = ''; for (let x = 6; x < 1200; x += 16) divider += dia(x, 5, 3.5);
    const fnv = (s) => { let h = 2166136261 >>> 0; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
    const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
    const cross = (cx, cy, u) => { const x0 = cx * u, y0 = cy * u, a = +(u * 0.16).toFixed(2), b = +(u * 0.84).toFixed(2); return 'M' + (x0 + a) + ' ' + (y0 + a) + 'L' + (x0 + b) + ' ' + (y0 + b) + 'M' + (x0 + b) + ' ' + (y0 + a) + 'L' + (x0 + a) + ' ' + (y0 + b); };
    const ornament = (str, R) => {
      const r = rng(fnv(str));
      const cType = Math.floor(r() * 3);
      const cSize = cType === 1 ? 2 : (r() < 0.5 ? 1 : 2);
      const rings = []; let k = cSize + 2;
      while (k <= R) { rings.push({ k: k, hook: k + 2 <= R && r() < 0.55, dot: k >= 5 && r() < 0.3 }); k += 2 + Math.floor(r() * 3); }
      const star = rings.length > 0 && r() < 0.55 ? Math.max(2, Math.ceil(rings[0].k * 0.7)) : 0;
      const branch = rings.length > 1 && r() < 0.5;
      const corners = R >= 7 && r() < 0.8;
      const pool = ['c'].concat(rings.map((_, i) => 'r' + i)).concat(star ? ['s'] : []).concat(corners ? ['k'] : []);
      const blackId = pool[Math.floor(r() * pool.length)];
      const last = rings.length ? rings[rings.length - 1].k : cSize;
      const col = (id) => (id === blackId ? 2 : 1);
      const at = (ax, ay) => {
        const d = ax + ay, m = Math.max(ax, ay);
        if (cType === 0 && d <= cSize) return col('c');
        if (cType === 1 && d <= 2 && d !== 1) return col('c');
        if (cType === 2 && (ax === 0 || ay === 0) && d <= cSize) return col('c');
        for (let i = 0; i < rings.length; i++) { const g = rings[i];
          if (d === g.k && (!g.dot || ax % 2 === 0)) return col('r' + i);
          if (g.hook && ((ax === 0 && ay === g.k + 1) || (ay === 0 && ax === g.k + 1) || (ax === 1 && ay === g.k + 2) || (ay === 1 && ax === g.k + 2))) return col('r' + i); }
        if (star && m === star && d > rings[0].k) return col('s');
        if (branch && ax === ay && d > rings[0].k && d < last) return 1;
        if (corners) { const dd = Math.abs(ax - (R - 2)) + Math.abs(ay - (R - 2)); if (dd === 1) return col('k'); if (dd === 0) return 2; }
        return 0;
      };
      let red = '', black = '';
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const on = at(Math.abs(x), Math.abs(y)); if (on) { const p = cross(x + R, y + R, 10); if (on === 1) red += p; else black += p; } }
      const n = (2 * R + 1) * 10;
      return { red: red, black: black, vb: '0 0 ' + n + ' ' + n };
    };
    const POSTS = [
      { slug: 'lacinka', title: 'Łacinka, Cyrillic and a slug field', alt: 'Łacinka, кірыліца і поле slug', lang: 'en', date: '12 лістапада', year: 2026, min: 6, topic: 'lang', dek: 'Every Belarusian name has two spellings. A URL can only hold one.' },
      { slug: 'agents', title: 'What changed when my squad started working with AI agents', alt: 'Што зьмянілася, калі мая каманда пачала працаваць з агентамі', lang: 'en', date: '28 кастрычніка', year: 2026, min: 9, topic: 'ai', dek: '' },
      { slug: 'laddzia', title: 'Чаму я перачытваю «Ладдзю роспачы»', alt: 'Why I keep rereading «The Boat of Despair»', lang: 'be', date: '9 кастрычніка', year: 2026, min: 7, topic: 'books', dek: '' },
      { slug: 'adr', title: 'ADRs are letters to the next team', alt: 'ADR як лісты наступнай камандзе', lang: 'en', date: '21 верасьня', year: 2026, min: 5, topic: 'eng', dek: '' },
      { slug: 'lagow', title: 'Łagów: замак, які стаў гатэлем', alt: 'Łagów: a castle that became a hotel', lang: 'be', date: '30 жніўня', year: 2026, min: 4, topic: 'travel', dek: '', photo: true },
      { slug: 'ddd', title: 'Domain-Driven Design, прачытаны двойчы', alt: 'Domain-Driven Design, read twice', lang: 'be', date: '2 жніўня', year: 2026, min: 8, topic: 'books', dek: '' }
    ].map((p) => Object.assign({}, p, {
      orn: ornament(p.title, 5),
      big: ornament(p.title, 8),
      meta: p.date + ', ' + (p.lang === 'en' ? 'па-ангельску, ' : '') + p.min + ' хв',
      gloss: p.lang === 'be' ? '' : p.alt,
      hasGloss: p.lang !== 'be',
      hasDek: !!p.dek
    }));
    const avatarTiles = (() => { let p = ''; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const d = Math.abs(i - 2) + Math.abs(j - 2); if (d === 1 || d === 2) { const x = 4 + i * 3.2 + 0.32, y = 4 + j * 3.2 + 0.32; p += 'M' + f2(x) + ' ' + f2(y) + 'h2.56v2.56h-2.56Z'; } } return p; })();
    const band = (() => {
      const P = 8, T = 6.4, COLS = 150, ROWS = 17; let rust = '', ink = '';
      const put = (c, r, col) => { const x = c * P + 0.8, y = r * P + 0.8; const q = 'M' + f2(x) + ' ' + f2(y) + 'h' + T + 'v' + T + 'h-' + T + 'Z'; if (col === 1) rust += q; else ink += q; };
      for (let c = 0; c < COLS; c++) { if (c % 2 === 0) { put(c, 0, 1); put(c, ROWS - 1, 1); } }
      for (let c = 1; c < COLS; c += 4) { put(c, 2, 2); put(c, ROWS - 3, 2); }
      for (let m = 0; m * 16 < COLS + 16; m++) {
        const cx = m * 16 + 7, cy = 8, kind = m % 2;
        for (let r = 3; r <= ROWS - 4; r++) for (let c = cx - 6; c <= cx + 6; c++) {
          if (c < 0 || c >= COLS) continue;
          const ax = Math.abs(c - cx), ay = Math.abs(r - cy), d = ax + ay;
          if (kind === 0) { if (d === 5) put(c, r, 1); else if (d === 3) put(c, r, 2); else if (d === 1) put(c, r, 1); }
          else { if (d === 4 && (ax === 0 || ay === 0 || ax === ay)) put(c, r, 1); else if (d === 2) put(c, r, 2); else if (d === 0) put(c, r, 1); }
        }
        const lx = m * 16 + 15; if (lx < COLS) { put(lx, cy, 2); put(lx, cy - 1, 1); put(lx, cy + 1, 1); }
      }
      return { rust: rust, ink: ink, vb: '0 0 ' + COLS * P + ' ' + ROWS * P };
    })();
    const base = {
      rootClass: 'es t-' + theme,
      lang: lang,
      isBe: lang === 'be', isEn: lang === 'en',
      setBe: () => this.setState({ lang: 'be' }), setEn: () => this.setState({ lang: 'en' }),
      mark: mark, divider: divider, posts: POSTS, avatarTiles: avatarTiles, band: band
    };
"""

def header(current):
    def cur(name):
        return ' aria-current="page"' if name == current else ''
    return f"""<a class="skip" href="#main">Перайсьці да зьместу</a>
<div class="wrap">
<header class="top">
<a class="brand" href="Home-A.dc.html">
<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 24px; height: 24px; display: block;"><path d="{{{{mark.outer}}}}" style="fill: var(--rust);"></path><path d="{{{{mark.inner}}}}" style="fill: var(--mark-in);"></path></svg>
<span>essentis</span>
</a>
<div class="navs">
<nav aria-label="Разьдзелы"><ul class="nav">
<li><a href="Writing.dc.html"{cur('writing')}>Допісы</a></li>
<li><a href="Home-A.dc.html#now"{cur('now')}>Цяпер</a></li>
<li><a href="About.dc.html"{cur('about')}>Пра мяне</a></li>
</ul></nav>
<div class="langs" role="group" aria-label="Мова сайта">
<button type="button" lang="be" aria-pressed="{{{{isBe}}}}" onClick="{{{{setBe}}}}">Бел</button>
<button type="button" lang="en" aria-pressed="{{{{isEn}}}}" onClick="{{{{setEn}}}}">Eng</button>
</div>
</div>
</header>
</div>
"""

FOOTER = """<div class="wrap" style="margin-top: 72px;">
<svg class="divider" viewBox="0 0 1200 10" preserveAspectRatio="xMinYMid slice" aria-hidden="true"><path d="{{divider}}" style="fill: none; stroke: var(--rust); stroke-width: 1; opacity: 0.6;"></path></svg>
<footer class="foot">
<ul>
<li><a href="https://t.me/essentis">Канал essentis</a></li>
<li><a href="https://t.me/danoctua">Telegram</a></li>
<li><a href="https://github.com/danoctua">GitHub</a></li>
<li><a href="https://www.linkedin.com/in/danoctua">LinkedIn</a></li>
</ul>
<p style="margin: 0; display: flex; align-items: center; min-height: 44px;">essentis, 2026</p>
</footer>
</div>
"""

ROW = """<a class="row" href="Post.dc.html">
<svg viewBox="{{p.orn.vb}}" aria-hidden="true" style="width: 44px; height: 44px; display: block;"><path d="{{p.orn.red}}" style="fill: none; stroke: var(--rust); stroke-width: 2.6; stroke-linecap: round;"></path><path d="{{p.orn.black}}" style="fill: none; stroke: var(--ink); stroke-width: 2.6; stroke-linecap: round;"></path></svg>
<span>
<span class="ttl" lang="{{p.lang}}">{{p.title}}</span>
<sc-if value="{{p.hasGloss}}" hint-placeholder-val="{{ false }}"><span class="gloss" lang="be">{{p.alt}}</span></sc-if>
<span class="meta">{{p.meta}}</span>
</span>
</a>"""

def page(title, board_css, body, extra_js, h):
    props = json.dumps({"theme": {"editor": "enum", "options": ["light", "dark", "auto"], "default": "light"}, "$preview": {"width": 1280, "height": h}})
    return f"""<!doctype html>
<html lang="be">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&amp;family=IBM+Plex+Mono:wght@400&amp;family=Alegreya:ital,wght@0,400;0,500;1,400&amp;display=swap">
<style>{CSS}{board_css}</style>
</helmet>
<div class="{{{{rootClass}}}}" lang="{{{{lang}}}}">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
class Component extends DCLogic {{
  renderVals() {{
{JS_LIB}
{extra_js}
  }}
}}
</script>
</body>
</html>
"""

# ---------- Home A: desk layout ----------
HOME_A_CSS = """
.es .hero{display:grid;gap:32px;padding-top:48px}
@media (min-width: 900px){.es .hero{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;padding-top:80px;align-items:start}}
.es .now{background:var(--raised);border-radius:10px;padding:24px;box-shadow:inset 0 0 0 1px var(--line)}
.es .lower{display:grid;gap:48px;margin-top:72px}
@media (min-width: 900px){.es .lower{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px}}
.es .note{display:flex;align-items:center;gap:16px;padding:14px 0;border-top:1px solid var(--line);text-decoration:none;min-height:44px;box-sizing:border-box}
.es .note:hover .ttl{color:var(--rust)}
.es .thumb{flex:none;display:flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:6px;background:repeating-linear-gradient(135deg,var(--raised) 0 8px,var(--paper) 8px 16px);box-shadow:inset 0 0 0 1px var(--line)}
"""
HOME_A_BODY = header('') + """<main id="main" class="wrap">
<section class="hero" aria-labelledby="name-h">
<div>
<div style="display: flex; align-items: center; gap: 20px;">
<svg viewBox="0 0 24 24" aria-hidden="true" style="flex: none; width: 88px; height: 88px; display: block;"><circle cx="12" cy="12" r="12" style="fill: var(--rust);"></circle><path d="{{avatarTiles}}" style="fill: var(--on-rust);"></path></svg>
<div>
<h1 id="name-h" style="margin: 0; font-size: clamp(36px, 5vw, 44px); line-height: 1.1; font-weight: 500; letter-spacing: -0.02em;">Данііл М.</h1>
<p lang="be-Latn" style="margin: 4px 0 0; font-size: 17px; color: var(--muted);">Daniił M.</p>
</div>
</div>
<p style="margin: 24px 0 0; max-width: 560px; font-size: 19px; line-height: 1.6; text-wrap: pretty;">Беларус, які жыве ў Польшчы. Інжынэр, муж, чытач Бахарэвіча і Караткевіча. Слухаю ўсё ад фолку да рэпу і вандрую.</p>
<p style="margin: 16px 0 0; font-size: 15px;"><a href="About.dc.html">Больш пра мяне</a></p>
</div>
<section id="now" class="now" aria-labelledby="now-h">
<h2 id="now-h" class="h2">Цяпер</h2>
<p style="margin: 8px 0 0; text-wrap: pretty;">Шукаю з камандай такі спосаб працы з агентамі ШІ, які мы абралі б і без хайпу. Перачытваю Бахарэвіча. Пішу першы доўгі тэкст для гэтага сайта.</p>
<p style="margin: 16px 0 0; font-size: 13px; line-height: 1.4; font-weight: 500; color: var(--muted);">Абноўлена 19&nbsp;лістапада</p>
</section>
</section>

<figure style="margin: 64px 0 0;">
<svg viewBox="{{band.vb}}" preserveAspectRatio="xMinYMid slice" aria-hidden="true" style="display: block; width: 100%; height: clamp(88px, 11vw, 136px);"><path d="{{band.rust}}" style="fill: var(--rust);"></path><path d="{{band.ink}}" style="fill: var(--ink);"></path></svg>
</figure>

<div class="lower" style="margin-top: 56px;">
<section aria-labelledby="latest-h">
<div class="sechead"><h2 id="latest-h" class="h2">Апошнія допісы</h2><a href="Writing.dc.html">Усе допісы</a></div>
<ul class="rows">
<sc-for list="{{latest}}" as="p" hint-placeholder-count="4">
<li>""" + ROW + """</li>
</sc-for>
</ul>
</section>
<section aria-labelledby="chan-h">
<div class="sechead"><h2 id="chan-h" class="h2">З канала essentis</h2><a href="https://t.me/essentis">Адкрыць канал</a></div>
<p style="margin: 0 0 8px; font-size: 15px; color: var(--muted);">Фотаальбомы і кароткія нататкі ў Telegram.</p>
<ul class="rows">
<li><a class="note" href="https://t.me/essentis/216"><span class="thumb" aria-hidden="true"><span style="font-size: 12px; line-height: 1.2; color: var(--muted);">фота</span></span><span style="flex: 1; min-width: 0;"><span class="ttl">Karkonosze // 2026</span><span class="meta">10&nbsp;фота, Telegram</span></span></a></li>
<li><a class="note" href="https://t.me/essentis/207"><span class="thumb" aria-hidden="true"><span style="font-size: 12px; line-height: 1.2; color: var(--muted);">фота</span></span><span style="flex: 1; min-width: 0;"><span class="ttl">Lagow // 2026</span><span class="meta">9&nbsp;фота, Telegram</span></span></a></li>
</ul>
</section>
</div>
</main>
""" + FOOTER
HOME_A_JS = "    return Object.assign(base, { latest: POSTS.slice(0, 4) });"

# ---------- Home B: one column, posts with pictures ----------
HOME_B_CSS = """
.es .col{max-width:720px}
.es .intro{padding-top:56px}
@media (min-width: 900px){.es .intro{padding-top:96px}}
.es .nowline{margin-top:32px;padding:16px 0 16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.es .cards{list-style:none;margin:0;padding:0;display:grid;gap:32px}
@media (min-width: 720px){.es .cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 32px}}
.es .card{display:block;text-decoration:none}
.es .card:hover .ttl{color:var(--rust)}
.es .pic{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;max-width:100%;border-radius:10px;background:var(--raised);box-shadow:inset 0 0 0 1px var(--line);margin-bottom:14px;overflow:hidden}
.es .photo{background:repeating-linear-gradient(135deg,var(--raised) 0 12px,var(--paper) 12px 24px)}
.es .wide{display:flex;justify-content:space-between;gap:48px;flex-wrap:wrap}
"""
HOME_B_BODY = header('') + """<main id="main" class="wrap">
<section class="intro col" aria-labelledby="name-h">
<h1 id="name-h" style="margin: 0; font-size: clamp(36px, 5vw, 44px); line-height: 1.1; font-weight: 500; letter-spacing: -0.02em;">Данііл М. <span lang="be-Latn" style="color: var(--muted); font-weight: 400;">Daniił M.</span></h1>
<p style="margin: 20px 0 0; font-size: 19px; line-height: 1.6; text-wrap: pretty;">Беларус, які жыве ў Польшчы. Інжынэр, муж, чытач Бахарэвіча і Караткевіча. Слухаю ўсё ад фолку да рэпу і вандрую. <a href="About.dc.html">Больш пра мяне</a></p>
<section id="now" class="nowline" aria-labelledby="now-h">
<p style="margin: 0;"><span id="now-h" style="font-weight: 500;">Цяпер.</span> Шукаю з камандай такі спосаб працы з агентамі ШІ, які мы абралі б і без хайпу. Перачытваю Бахарэвіча. Пішу першы доўгі тэкст для гэтага сайта. <span style="font-size: 15px; color: var(--muted);">Абноўлена 19&nbsp;лістапада.</span></p>
</section>
</section>

<section aria-labelledby="latest-h" style="margin-top: 72px;">
<div class="sechead"><h2 id="latest-h" class="h2">Апошнія допісы</h2><a href="Writing.dc.html">Усе допісы</a></div>
<ul class="cards" style="margin-top: 16px;">
<sc-for list="{{latest}}" as="p" hint-placeholder-count="4">
<li><a class="card" href="Post.dc.html">
<sc-if value="{{p.photo}}" hint-placeholder-val="{{ false }}">
<span class="pic photo"><span style="font-size: 13px; color: var(--muted);">Фота з допісу</span></span>
</sc-if>
<sc-if value="{{p.noPhoto}}" hint-placeholder-val="{{ true }}">
<span class="pic"><svg viewBox="{{p.big.vb}}" aria-hidden="true" style="width: 96px; height: 96px; display: block;"><path d="{{p.big.red}}" style="fill: none; stroke: var(--rust); stroke-width: 2.4; stroke-linecap: round;"></path><path d="{{p.big.black}}" style="fill: none; stroke: var(--ink); stroke-width: 2.4; stroke-linecap: round;"></path></svg></span>
</sc-if>
<span class="ttl" lang="{{p.lang}}">{{p.title}}</span>
<sc-if value="{{p.hasGloss}}" hint-placeholder-val="{{ false }}"><span class="gloss" lang="be">{{p.alt}}</span></sc-if>
<span class="meta">{{p.meta}}</span>
</a></li>
</sc-for>
</ul>
</section>

<section aria-labelledby="chan-h" style="margin-top: 72px;" class="col">
<div class="sechead"><h2 id="chan-h" class="h2">З канала essentis</h2><a href="https://t.me/essentis">Адкрыць канал</a></div>
<ul class="rows">
<li><a class="row" href="https://t.me/essentis/216" style="grid-template-columns: minmax(0, 1fr) auto;"><span class="ttl">Karkonosze // 2026</span><span class="meta" style="margin: 0;">10&nbsp;фота, Telegram</span></a></li>
<li><a class="row" href="https://t.me/essentis/207" style="grid-template-columns: minmax(0, 1fr) auto;"><span class="ttl">Lagow // 2026</span><span class="meta" style="margin: 0;">9&nbsp;фота, Telegram</span></a></li>
</ul>
</section>
</main>
""" + FOOTER
HOME_B_JS = """    const withPic = POSTS.slice(1, 5).map((p) => Object.assign({}, p, { noPhoto: !p.photo }));
    return Object.assign(base, { latest: withPic });"""

# ---------- Writing ----------
WRITING_CSS = """
.es .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px;list-style:none;padding:0}
.es .chip{min-height:44px;padding:0 14px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--line);font-size:15px;color:var(--muted)}
.es .chip[aria-pressed="true"]{background:var(--raised);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rust)}
.es .year{display:grid;gap:8px;margin-top:48px}
@media (min-width: 900px){.es .year{grid-template-columns:160px minmax(0,1fr);gap:32px}}
.es .dek{display:block;margin-top:6px;font-family:Alegreya,Georgia,serif;font-style:italic;font-size:18px;line-height:1.45;color:var(--ink)}
"""
WRITING_BODY = header('writing') + """<main id="main" class="wrap">
<div style="max-width: 880px; padding-top: 64px;">
<h1 style="margin: 0; font-size: clamp(28px, 4vw, 32px); line-height: 1.2; font-weight: 500;">Допісы</h1>
<p style="margin: 8px 0 0; color: var(--muted); max-width: 600px;">Доўгія тэксты пра інжынэрыю і кіраваньне, ШІ, беларускую мову і культуру, кнігі, музыку і падарожжы. Па-беларуску і па-ангельску.</p>
<div role="group" aria-label="Тэма" class="chips">
<sc-for list="{{topics}}" as="t" hint-placeholder-count="7">
<button type="button" class="chip" aria-pressed="{{t.on}}" onClick="{{t.pick}}">{{t.label}}</button>
</sc-for>
</div>
<sc-if value="{{empty}}" hint-placeholder-val="{{ false }}">
<p style="margin: 48px 0 0; color: var(--muted);">Пакуль няма допісаў на гэтую тэму.</p>
</sc-if>
<sc-for list="{{years}}" as="y" hint-placeholder-count="1">
<section class="year" aria-label="{{y.year}}">
<h2 style="margin: 16px 0 0; font-size: 22px; font-weight: 500; color: var(--muted); font-variant-numeric: tabular-nums;">{{y.year}}</h2>
<ul class="rows">
<sc-for list="{{y.items}}" as="p" hint-placeholder-count="6">
<li><a class="row" href="Post.dc.html">
<svg viewBox="{{p.orn.vb}}" aria-hidden="true" style="width: 44px; height: 44px; display: block;"><path d="{{p.orn.red}}" style="fill: none; stroke: var(--rust); stroke-width: 2.6; stroke-linecap: round;"></path><path d="{{p.orn.black}}" style="fill: none; stroke: var(--ink); stroke-width: 2.6; stroke-linecap: round;"></path></svg>
<span>
<span class="ttl" lang="{{p.lang}}">{{p.title}}</span>
<sc-if value="{{p.hasGloss}}" hint-placeholder-val="{{ false }}"><span class="gloss" lang="be">{{p.alt}}</span></sc-if>
<sc-if value="{{p.hasDek}}" hint-placeholder-val="{{ false }}"><span class="dek" lang="{{p.lang}}">{{p.dek}}</span></sc-if>
<span class="meta">{{p.meta}}</span>
</span>
</a></li>
</sc-for>
</ul>
</section>
</sc-for>
</div>
</main>
""" + FOOTER
WRITING_JS = """    const T = [['all', 'Усе'], ['eng', 'Інжынэрыя і кіраваньне'], ['ai', 'ШІ'], ['lang', 'Мова і культура'], ['books', 'Кнігі'], ['music', 'Музыка'], ['travel', 'Падарожжы']];
    const sel = st.topic || 'all';
    const items = POSTS.filter((p) => sel === 'all' || p.topic === sel);
    return Object.assign(base, {
      topics: T.map((t) => ({ label: t[1], on: t[0] === sel, pick: () => this.setState({ topic: t[0] }) })),
      years: items.length ? [{ year: '2026', items: items }] : [],
      empty: items.length === 0
    });"""

# ---------- About ----------
ABOUT_CSS = """
.es .grid{display:grid;gap:48px;padding-top:64px}
@media (min-width: 900px){.es .grid{grid-template-columns:minmax(0,640px) minmax(0,1fr);gap:96px}}
.es .prose p{margin:0 0 16px;text-wrap:pretty}
.es .sec{margin-top:56px}
.es .years{list-style:none;margin:16px 0 0;padding:0}
.es .years li{display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;padding:14px 0;border-top:1px solid var(--line)}
.es .ph{color:var(--muted)}
.es .aside{display:flex;flex-direction:column;gap:16px}
@media (min-width: 900px){.es .aside{padding-top:8px}}
"""
ABOUT_BODY = header('about') + """<main id="main" class="wrap">
<div class="grid">
<div class="prose">
<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;"><svg viewBox="0 0 24 24" aria-hidden="true" style="flex: none; width: 64px; height: 64px; display: block;"><circle cx="12" cy="12" r="12" style="fill: var(--rust);"></circle><path d="{{avatarTiles}}" style="fill: var(--on-rust);"></path></svg><h1 style="margin: 0; font-size: clamp(28px, 4vw, 32px); line-height: 1.2; font-weight: 500;">Пра мяне</h1></div>
<p style="font-size: 19px;">Я беларус, жыву ў Польшчы. Пішу па-беларуску і па-ангельску, а гэты сайт і канал essentis вяду для сябе і для ўсіх, каму цікавыя тыя ж рэчы.</p>
<p>Муж. Чытаю павольна і часта вяртаюся: Бахарэвіч, Караткевіч, кнігі пра тое, як будаваць сыстэмы, якія застаюцца зразумелымі. Слухаю ўсё ад фолку да рэпу.</p>
<p>Вандрую, часьцей за ўсё ў горы. Фатаграфіі з паездак трапляюць у канал з подпісам «Месца // Год».</p>

<section class="sec" aria-labelledby="work-h">
<h2 id="work-h" class="h2" style="margin-bottom: 12px;">Праца</h2>
<p>Пішу софт з 2019 году: Python, найчасьцей бэкэнд, нямала скрэйпэраў і канвэераў даных, і трохі React, калі больш не было каму. Цяпер Lead Engineer у CluePoints: кірую камандай сэньёр-інжынэраў і вяду ў ёй AI-трансфармацыю.</p>
<ul class="years">
<li><span class="muted" style="font-variant-numeric: tabular-nums;">[год]–цяпер</span><span><span style="display: block; font-weight: 500;">Lead Engineer, CluePoints</span><span class="muted" style="display: block; font-size: 15px;">Софт для клінічных дасьледаваньняў. Каманда сэньёр-інжынэраў, праца з агентамі ШІ.</span></span></li>
<li><span class="muted" style="font-variant-numeric: tabular-nums;">[год]–[год]</span><span><span class="ph" style="display: block; font-weight: 500;">[Роля], [кампанія]</span><span class="muted" style="display: block; font-size: 15px;">[Адзін радок пра тое, што зьмянілася.]</span></span></li>
<li><span class="muted" style="font-variant-numeric: tabular-nums;">2019–[год]</span><span><span class="ph" style="display: block; font-weight: 500;">[Роля], [кампанія]</span><span class="muted" style="display: block; font-size: 15px;">[Адзін радок пра тое, што зьмянілася.]</span></span></li>
</ul>
<h3 style="margin: 32px 0 4px; font-size: 18px; font-weight: 500;">Праекты</h3>
<ul class="years">
<li style="grid-template-columns: minmax(0, 1fr);"><span><span style="display: block; font-weight: 500;">essentis.xyz</span><span class="muted" style="display: block; font-size: 15px;">Гэты сайт: Astro, Firestore і транслітарацыя ў Łacinka для адрасоў старонак.</span></span></li>
<li style="grid-template-columns: minmax(0, 1fr);"><span><span class="ph" style="display: block; font-weight: 500;">[Праект]</span><span class="muted" style="display: block; font-size: 15px;">[Якая была праблема і што зроблена.]</span></span></li>
<li style="grid-template-columns: minmax(0, 1fr);"><span><span class="ph" style="display: block; font-weight: 500;">[Праект]</span><span class="muted" style="display: block; font-size: 15px;">[Якая была праблема і што зроблена.]</span></span></li>
</ul>
</section>

<section class="sec" aria-labelledby="uses-h">
<h2 id="uses-h" class="h2" style="margin-bottom: 12px;">Чым карыстаюся</h2>
<p>Python, FastAPI, Django, PostgreSQL, Docker. Агенты ШІ для руціны, якую раней рабілі рукамі. ADR для ўсяго, што трэба будзе памятаць праз год.</p>
</section>

<section class="sec" aria-labelledby="links-h">
<h2 id="links-h" class="h2" style="margin-bottom: 4px;">Спасылкі</h2>
<ul class="rows">
<li><a class="row" style="grid-template-columns: minmax(0, 1fr) auto;" href="https://t.me/essentis"><span class="ttl">Канал essentis</span><span class="meta" style="margin: 0;">t.me/essentis</span></a></li>
<li><a class="row" style="grid-template-columns: minmax(0, 1fr) auto;" href="https://t.me/danoctua"><span class="ttl">Telegram</span><span class="meta" style="margin: 0;">@danoctua</span></a></li>
<li><a class="row" style="grid-template-columns: minmax(0, 1fr) auto;" href="https://github.com/danoctua"><span class="ttl">GitHub</span><span class="meta" style="margin: 0;">danoctua</span></a></li>
<li><a class="row" style="grid-template-columns: minmax(0, 1fr) auto;" href="https://www.linkedin.com/in/danoctua"><span class="ttl">LinkedIn</span><span class="meta" style="margin: 0;">danoctua</span></a></li>
<li><a class="row" style="grid-template-columns: minmax(0, 1fr) auto;" href="mailto:danoctua@gmail.com"><span class="ttl">Пошта</span><span class="meta" style="margin: 0;">danoctua@gmail.com</span></a></li>
</ul>
</section>
</div>

<aside class="aside" aria-labelledby="why-h">
<svg viewBox="0 0 24 24" aria-hidden="true" style="width: 120px; height: 120px; display: block;"><path d="{{mark.outer}}" style="fill: var(--rust);"></path><path d="{{mark.inner}}" style="fill: var(--mark-in);"></path></svg>
<h2 id="why-h" class="h2">Чаму essentis</h2>
<p style="margin: 0; text-wrap: pretty;">Ступеньчаты ромб: так выглядае поле, калі яго ўткаць у палатно. Сярэдзіна пакінутая пустой наўмысна.</p>
<p style="margin: 0; font-size: 15px; color: var(--muted); text-wrap: pretty;">У беларускім арнамэнце ромб звычайна азначае зямлю і засеянае поле. Чырвоная і чорная ніткі на нефарбаваным льне здаўна спалучаюцца ў беларускай вышыўцы. Назва essentis азначае самае істотнае: тое, што застаецца, калі прыбраць шум.</p>
</aside>
</div>
</main>
""" + FOOTER
ABOUT_JS = "    return base;"

# ---------- Post ----------
POST_CSS = """
.es .ph-head{display:grid;gap:24px;padding-top:56px}
@media (min-width: 900px){.es .ph-head{grid-template-columns:minmax(0,1fr) 120px;gap:48px;padding-top:88px}}
.es .read{max-width:34em;font-family:Alegreya,Georgia,serif;font-size:20px;line-height:1.6;text-wrap:pretty}
.es .read p{margin:0 0 20px}
.es .drop::first-letter{float:left;font-weight:500;font-size:3.3em;line-height:0.85;color:var(--rust);margin:0.08em 0.12em 0 0}
.es .fn{position:relative;top:-0.45em;margin:-12px -4px;padding:12px 8px;font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:13px;font-weight:500;line-height:1;color:var(--rust)}
.es .code{overflow-x:auto;background:var(--raised);border-radius:6px;padding:16px 18px;box-shadow:inset 0 0 0 1px var(--line)}
.es .code pre{margin:0;font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-size:14px;line-height:1.6}
.es .pn{display:grid;gap:24px;margin-top:48px}
@media (min-width: 720px){.es .pn{grid-template-columns:repeat(2,minmax(0,1fr))}}
"""
POST_BODY = header('writing') + """<main id="main" class="wrap">
<article>
<div class="ph-head">
<div style="max-width: 760px;">
<p style="margin: 0; font-size: 15px; color: var(--muted);"><time datetime="2026-11-12">12&nbsp;лістапада 2026</time>, чацьвер. 6&nbsp;хв чытаньня, па-ангельску.</p>
<h1 lang="en" style="margin: 12px 0 0; font-size: clamp(28px, 4vw, 32px); line-height: 1.2; font-weight: 500; text-wrap: balance;">Łacinka, Cyrillic and a slug field</h1>
<p lang="be" style="margin: 6px 0 0; font-size: 17px; color: var(--muted);">Łacinka, кірыліца і поле slug</p>
<p lang="en" style="margin: 20px 0 0; font-family: Alegreya, Georgia, serif; font-style: italic; font-size: 22px; line-height: 1.4;">Every Belarusian name has two spellings. A URL can only hold one.</p>
<p style="margin: 16px 0 0; font-size: 15px; color: var(--muted);">Гэты допіс па-ангельску. Пераклад зьявіцца пазьней.</p>
</div>
<svg viewBox="{{post.big.vb}}" aria-hidden="true" style="width: 96px; height: 96px; display: block;"><path d="{{post.big.red}}" style="fill: none; stroke: var(--rust); stroke-width: 2.4; stroke-linecap: round;"></path><path d="{{post.big.black}}" style="fill: none; stroke: var(--ink); stroke-width: 2.4; stroke-linecap: round;"></path></svg>
</div>

<div class="read" lang="en" style="margin-top: 48px;">
<p class="drop">My name has two spellings, and both are correct. In Cyrillic it is Данііл. In Łacinka, the Latin alphabet Belarusian has been written in for centuries, it is Daniił. When I started this site, the first decision was not the framework. It was what goes into the URL.</p>
<p>Slugs are usually an afterthought: lowercase everything, strip the accents, swap spaces for hyphens. Run Belarusian through a typical slugify and you get a transliteration built for Russian. It turns ў into a bare u and loses the difference between л and ль, which in Łacinka is the difference between ł and l.</p>
<p>Łacinka already solves this, and its rules are small enough to fit in a function. Hard л becomes ł, soft л becomes l, ў becomes ŭ, and the soft sign folds into the consonant before it: зь, сь, нь and ць become ź, ś, ń and ć.<button type="button" class="fn" aria-expanded="{{noteOpen}}" aria-label="Заўвага 1" onClick="{{toggleNote}}">1</button></p>
<sc-if value="{{noteOpen}}" hint-placeholder-val="{{ false }}">
<p style="margin-top: -8px; padding: 12px 16px; background: var(--raised); border-radius: 6px; font-size: 17px; line-height: 1.5;"><span style="color: var(--rust); font-weight: 500;">1&nbsp;</span>Łacinka has more than one convention. These are the rules I use, and the ones this site's code follows.</p>
</sc-if>
<figure style="margin: 28px 0; font-family: 'IBM Plex Sans', system-ui, sans-serif;">
<div class="code" tabindex="0" role="region" aria-label="Код на Python">
<pre>SOFT = {"з": "ź", "с": "ś", "н": "ń", "ц": "ć"}

def lacinka(word, base):
    out = []
    for i, ch in enumerate(word):
        nxt = word[i + 1 : i + 2]
        if ch == "л":
            soft = nxt != "" and nxt in "ьіеёюя"
            out.append("l" if soft else "ł")
        elif ch in SOFT and nxt == "ь":
            out.append(SOFT[ch])
        elif ch != "ь":
            out.append(base.get(ch, ch))
    return "".join(out)</pre>
</div>
<figcaption lang="be" style="margin-top: 8px; font-size: 15px; color: var(--muted);">Зычныя: ці мяккая літара, вырашае наступная.</figcaption>
</figure>
<p>That covers the consonants. Vowels need one more rule, about when е turns into ie and when into je, and that is next month's post.</p>
<p>The code was the easy part. A URL is a public decision about which alphabet comes first. I chose Łacinka for the address bar and both scripts for everything a person reads.</p>
</div>

<svg viewBox="0 0 72 10" aria-hidden="true" style="display: block; width: 72px; height: 10px; margin: 40px 0;"><path d="{{divider}}" style="fill: none; stroke: var(--rust); stroke-width: 1; opacity: 0.6;"></path></svg>

<section aria-labelledby="notes-h" style="max-width: 34em; font-size: 15px; color: var(--muted);">
<h2 id="notes-h" style="margin: 0 0 4px; font-size: 15px; font-weight: 500; color: var(--ink);">Заўвагі</h2>
<p lang="en" style="margin: 0;">1. Łacinka has more than one convention. These are the rules I use, and the ones this site's code follows.</p>
</section>
</article>

<p style="margin: 40px 0 0;"><a href="https://t.me/essentis" style="display: inline-flex; align-items: center; min-height: 44px; font-weight: 500;">Абмеркаваць у канале essentis</a></p>

<nav class="pn" aria-label="Іншыя допісы">
<div>
<p style="margin: 0 0 4px; font-size: 13px; font-weight: 500; color: var(--muted);">Папярэдні допіс</p>
<ul class="rows"><li>""" + ROW.replace('{{p.', '{{prev.') + """</li></ul>
</div>
</nav>
</main>
""" + FOOTER
POST_JS = """    const open = !!st.note;
    return Object.assign(base, { post: POSTS[0], prev: POSTS[1], noteOpen: open, toggleNote: () => this.setState({ note: !open }) });"""

pages = {
    'Home-A.dc.html': ('essentis home, desk', HOME_A_CSS, HOME_A_BODY, HOME_A_JS, 1500),
    'Home-B.dc.html': ('essentis home, one column', HOME_B_CSS, HOME_B_BODY, HOME_B_JS, 1900),
    'Writing.dc.html': ('essentis writing', WRITING_CSS, WRITING_BODY, WRITING_JS, 1500),
    'About.dc.html': ('essentis about', ABOUT_CSS, ABOUT_BODY, ABOUT_JS, 2300),
    'Post.dc.html': ('essentis long read', POST_CSS, POST_BODY, POST_JS, 2500),
}
for name, (t, css, body, js, h) in pages.items():
    (OUT / name).write_text(page(t, css, body, js, h))
    print(name, len((OUT / name).read_text()))
