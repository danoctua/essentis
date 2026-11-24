# essentis

Notes on engineering, Belarusian culture, books and music, by Daniił M.

essentis is the personal site, blog and Telegram channel (t.me/essentis) of Daniił M. / Данііл М. The name means *essentials*: what is left after the noise is removed. The brand should feel quiet, precise and rooted, in that order. It is a person's home on the web, not a product and not a CV.

**Privacy rule.** The owner's surname never appears anywhere: text, meta tags, alt text, file names, structured data. Use "Daniił M." in Latin script and "Данііл М." in Cyrillic.

## The mark

![essentis mark](/_blob/2e5c0ad9fdaf2af6c380d6bdd1b196a0)

The mark is called **Мазаіка** (mosaic): a stepped rhombus of twelve square tiles on a 5 × 5 grid. The outer ring of eight tiles is rust, the inner ring of four is ink, and the centre is empty.

### What it means

Use this text wherever the mark needs explaining (About page, channel description). The Belarusian version needs the owner's proofreading.

> **EN, short.** A stepped rhombus, the way a field looks when it is woven into cloth, with the middle left open on purpose.
>
> **EN, long.** In weaving and cross-stitch every shape is built on a grid of threads, so a rhombus becomes a staircase of squares. In Belarusian ornament the rhombus usually stands for the earth and the sown field, and rhombi nested inside each other for growth and for protection. The two colours are the classic pair of Belarusian embroidery, red thread and black thread on undyed linen. A folk rhombus usually holds a seed at its centre. This one leaves the centre open: the pattern exists to frame what matters, and what matters is not drawn. That is what essentis means, the essentials, what is left after the noise.
>
> **BE, short (draft).** Ступеньчаты ромб: так выглядае поле, калі яго ўткаць у палатно. Сярэдзіна пакінутая пустой наўмысна.

These readings of the rhombus come from ethnography and folk tradition rather than from the weavers themselves; present them as tradition, not as fact.

### Construction

- Grid: 5 × 5 cells at a 4.8-unit pitch in a 24-unit box. Tiles are 3.8 units, so the gap is one fifth of the pitch.
- Tiles: cells whose distance from the centre (|x| + |y|) is 2 are rust, distance 1 are ink, distance 0 is empty.
- Clear space: one tile pitch on every side. Nothing else touches it.
- Smallest size: 16 px, using the favicon version (gap 0.4 units so the tiles do not dissolve).

### Versions

| File | Use |
| --- | --- |
| `essentis-mark.svg` | Rust and ink on light paper. The default. |
| `essentis-mark-dark.svg` | Light rust and light ink, for dark backgrounds. |
| `essentis-mark-mono.svg` | All twelve tiles in ink. Print, single-colour contexts. |
| `essentis-favicon.svg` | Tighter gaps for 16 and 32 px. |
| `essentis-avatar.svg`, `essentis-avatar.png` | Linen tiles on a rust field, 640 px PNG for the Telegram channel and profile pictures. Telegram crops it to a circle; the mark stays inside. |

### Lockup

Mark, then the wordmark **essentis** in IBM Plex Sans 500, always lowercase. The mark is 1.6 times the wordmark's cap height and sits 0.4 mark-widths from it. On the site header the mark is 24 px and the wordmark 18 px.

### Do not

- Fill the centre, rotate the mark, outline it, or add a gradient or shadow.
- Recolour it outside `rust`, `ink`, `on-rust` and the dark-theme pair.
- Set the wordmark in capitals or in any other face.
- Put the mark on a photo.

## Voice

Quiet, reflective and specific. Write the way you would explain something to a colleague you respect.

- Sentence case everywhere: titles, buttons, navigation.
- No exclamation marks, no greetings ("Hi, I'm…"), no hype words (seamless, supercharge, game-changing, unlock).
- Concrete over clever: "I lead a squad of senior engineers at CluePoints" beats "passionate leader".
- No invented numbers or testimonials.
- Belarusian follows the official orthography, the 2008 rules (свет, жыццё, рашэнні, інжынер), not Taraškievica. Telegram posts and album captions are never edited: they keep the channel's own spelling. Every new Belarusian string gets the owner's proofreading.
- Every fragment in the other language carries a `lang` attribute: `be` for Cyrillic, `be-Latn` for Łacinka, `en` for English.

## Colour

Two themes from the same eight tokens. Linen and ink carry the page; rust is the only accent and stays rare: the mark, links, the post ornament, the initial letter of a long read and the focus ring. If a screen looks orange, there is too much rust.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `paper` | #efe9df | #1a1714 | Page background |
| `paper-raised` | #f6f2ea | #231f1b | Now block, code, open footnotes |
| `ink` | #221d18 | #ece4d7 | Text, the mark's inner ring |
| `muted` | #6e6458 | #a89c8c | Dates, meta, captions |
| `rust` | #a5512a | #e08a5c | The accent |
| `on-rust` | #efe9df | #1a1714 | Anything on a rust field |
| `line` | #d8cfc1 | #36302a | Hairlines |

All text pairs pass WCAG AA. The tightest are rust on paper (4.6:1) and on-rust on rust (4.6:1) in the light theme: never set rust text smaller than 15 px or lighter than 400.

## Typography

- **IBM Plex Sans** (400, 500) for the interface, headings and the wordmark. Precise without being cold, with full Cyrillic and the Łacinka letters ł ŭ č ś ź ć ń š ž.
- **Alegreya** (400, italic 400) only inside long reads, so a post reads like a printed book.
- **IBM Plex Mono** (400) for code.
- Weights stop at 500. No capitals with tracking, no eyebrows above headings, no italic for emphasis outside the dek.
- Self-host all three on the site with Cyrillic, Latin and Latin Extended-A subsets.

### The initial letter

The first paragraph of every long read opens with a red initial in the tradition of Skaryna's printed books: Alegreya 500 at 3.3 em in `rust`, floated, three lines deep, with no frame. It is the only decorated letter on the site.

## Ornament

Belarusian ornament gives the pages their picture, so it is used with intent, never as wallpaper. It appears in these places only:

1. **The mark**, in the header and favicon.
2. **The avatar**: the mark's twelve tiles in `on-rust` on a `rust` disc. 88 px before the name on Home, 64 px before the title on About, and as the Telegram picture. It can be swapped for a photo later; the disc stays.
3. **The woven band**: one full-width strip of square tiles at an 8 px pitch, like the end of a rushnik. A dotted rust border top and bottom, alternating rhombus motifs (concentric rings, and an eight-point figure) linked by small crosses, in `rust` and `ink` on `paper`. 88 to 136 px tall, cropped rather than shrunk on narrow screens. Once per page, on Home only, between the intro and the lists.
4. **The stitched divider**: a single row of small rust rhombus outlines at 60% opacity, used once at the end of a long read and once above the footer.
5. **The post ornament**: each post gets a small cross-stitch ornament generated from its title (the same title always gives the same ornament), in rust and ink. 44 px in lists, 96 px at the top of a post. It stands in for a cover image when a post has none.

Photos from the channel appear as 72 px square thumbnails next to album titles. No background textures, no ornament behind text, no ornament in buttons.

## Layout

- Separate pages: Home, Writing, About, Now, and each post. Familiar structure; the character comes from type, colour and the three ornament uses.
- Page box up to 1120 px with a 12-column grid and 24 px gutters on desktop. Long-read text stays at 34 em even on wide screens; the extra space goes to the margin, where footnotes and the post ornament can sit.
- Mobile first: a 16 px gutter, one column, nothing scrolls sideways except code blocks.
- Tap targets are at least 44 px.

## Motion

Colour changes on hover and focus (150 ms). Nothing else moves. No scroll effects, no entrances, no autoplay. Respect `prefers-reduced-motion` by removing even the colour transition.

## Accessibility checklist

- Visible focus ring on everything: 2 px `focus`, 3 px offset.
- A skip link on every page ("Перайсці да зместу" / "Skip to content").
- `lang` on the root and on every fragment in another language.
- Non-breaking spaces between numbers and units ("6 хв", "12 лістапада").
- Contrast as in the colour table, checked in both themes.

## Never

Inter-only type, purple or blue gradients, glass effects, bento grids, rows of identical rounded cards with shadows, emoji as icons, "Hi, I'm X 👋", tracked capitals, numbered markers that are not a real sequence, arrows appended to links, left-border accent cards, invented metrics.
