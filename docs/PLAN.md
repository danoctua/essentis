# essentis.xyz — build plan

## Context

Daniił wants a personal site and blog under the **essentis** brand. Branding and page drafts are settled:
- **Brand book:** https://claude.ai/artifact/P9i8vJypzPPXLMFohVZcaa (tokens, Мазаіка mark, type, voice, ornament rules, page structure).
- **Canvas drafts:** https://claude.ai/artifact/LbPyVD4bxUNbMZeEqTU8Qb, artboards Home-A (chosen), Writing, About, Post.

The decisions that shape the build:
- Publishing happens from a web admin with a plain Markdown editor and live preview, not from git.
- All content lives in Firebase; the repo holds only code and static assets.
- The stack has to be free or near free.
- Telegram posts reach the site through a local, re-runnable sync script. A bot is a later fallback.

### Decided
- **Site:** Astro, static output, rebuilt on publish through a Vercel deploy hook.
- **Hosting:** Vercel Hobby (non-commercial use).
- **Data and sign-in:** Firestore on the free Spark plan, Firebase Auth (Google sign-in, owner only).
- **Photos:** Cloudflare R2 at `media.essentis.xyz`. The owner will move the domain's DNS to Cloudflare; the site itself stays on Vercel.
- **Languages:** Belarusian at `/`, English at `/en/`.
  - Slugs are ASCII-folded Łacinka, made by `slugify()` in `src/lib/lat.ts`.
  - A post has an original language and an optional full translation.
- **Telegram:** Telethon sync script in Python, incremental, with its own new Telethon session stored in the repo's git-ignored `sessions/` folder. The channel is t.me/essentis.
- **Pages:** Home (layout A), Writing, Post, About (who I am, why essentis, Work, Uses, Links), Now.
  - The Now note is Markdown without images, shown on Home and at `/ciapier/`.
  - Channel albums appear on Home with thumbnails and link out to Telegram. There are no note pages on the site.
- **Privacy:** the surname never appears anywhere. The email `danoctua@gmail.com` is a placeholder for now.

## Architecture

```
Admin (/admin, Preact island) ──Firebase Auth──▶ Firestore (posts, pages, notes)
   │  resize images in browser → POST /api/media/sign → presigned PUT → R2
   └─ "Publish" → POST /api/publish → Vercel deploy hook
Vercel build: Astro + Firestore content loader (firebase-admin) → static HTML
tools/tg_sync (Python, local): Telethon → Pillow WebP → R2 (boto3) + Firestore notes → optional deploy hook
```

- **Routes:** everything is prerendered except two API routes (`prerender = false`) running on the `@astrojs/vercel` adapter.
- **`/api/media/sign`:** checks the Firebase ID token, requires the owner's `uid` (`ADMIN_UID`), and returns a presigned R2 PUT URL using the S3 client.
- **`/api/publish`:** same token check, then calls `VERCEL_DEPLOY_HOOK_URL`. It skips the call if the last publish was under 60 seconds ago.
- **Firestore rules:** no public reads, because the build uses the admin SDK. Writes are allowed only when `request.auth.uid == ADMIN_UID`, so drafts are never exposed.
- **Local fixtures:** when Firebase environment variables are missing, the loader falls back to `fixtures/*.json`. Local dev and CI then work without credentials.

## Firestore data model

| Path | Fields |
|---|---|
| `posts/{id}` | `originalLang`, `slug`, `topics[]`, `status: draft\|published`, `publishedAt`, `updatedAt`, `cover?{key,w,h,alt}`, `variants: {be?: {title, dek?, body?}, en?: {…}}` |
| `pages/now` | `be.body`, `en.body` (Markdown, images stripped), `updatedAt` |
| `pages/about` | `be/en: {bio, intro, meaning, workSummary}` (Markdown) |
| `pages/uses` | `be.body`, `en.body` |
| `work/{id}` | `from`, `to?`, `role`, `company`, `line: {be, en}`, `order` |
| `projects/{id}` | `name`, `url?`, `text: {be, en}`, `order` |
| `notes/{firstMsgId}` | `date`, `text`, `place?`, `year?`, `photos[{key,w,h}]`, `tgUrl`, `groupedId?`, `editDate?`, `hidden` |
| `sync/telegram` | `lastMessageId`, `lastRunAt` |

Field rules:
- **`slug`:** generated from the original title on first publish, then frozen.
- **Gloss:** a variant with only a `title` acts as the title gloss shown in the other language.
- **Translations:** a variant with a `body` is a full translation. The other-language page shows it, or falls back to the original with "Гэты допіс па-ангельску…".
- **Media keys:**
  - posts: `posts/{postId}/{hash}-{400|800|1600}.webp`
  - notes: `notes/{msgId}/{n}-{w}.webp`

Static configuration stays in the repo, in `src/lib/site.ts`: links, email, navigation and UI strings.

## Phases

### 1. Foundations (repo `~/Projects/essentis`, reuse the scaffold)

**Keep:**
- `src/lib/lat.ts` and `src/lib/ornament.ts` with `tests/lib.test.ts`;
- the `src/data/ui.ts` structure;
- the build setup in `astro.config.mjs` and `package.json`.

**Remove:** Rubik and JetBrains Mono, the month colours, `Band`, `BandDefs` and `Swatch`, `src/content/`, `src/lib/posts.ts`, and the current `content.config.ts`.

**Add:**
- **Tokens:** `src/styles/tokens.css`, generated from the brand book's `tokens.json` by `scripts/tokens.mjs` (light and dark, plus `prefers-color-scheme`).
- **Fonts:** self-hosted IBM Plex Sans 400/500, IBM Plex Mono 400 and Alegreya 400/500/italic, from `@fontsource`, with Cyrillic, Latin and Latin Extended subsets (as the scaffold's `src/styles/fonts.css` does now).
- **Components:**
  - `Mark.astro` (12 tiles), `Avatar.astro`, `WovenBand.astro` (port the band generator from the Home-A artboard), `Divider.astro`;
  - `PostOrnament.astro`, wrapping `ornament()`;
  - `Header.astro`, `Footer.astro`, `PostRow.astro`, `NowBlock.astro`, `AlbumRow.astro`.
- **Layouts:** `Base.astro`, with the skip link, `lang`, `hreflang` alternates, a theme following the system setting, and a 2-line language-memory script.
- **Pages:** all routes in both languages, rendered from fixtures:
  - `/`, `/dopisy/`, `/dopisy/[slug]/`, `/pra-mianie/`, `/ciapier/`;
  - their `/en/` counterparts: `/en/`, `/en/writing/`, `/en/writing/[slug]/`, `/en/about/`, `/en/now/`.

**Verify:** `npm run dev`, and compare the pages against the canvas artboards at 390 px and 1280 px in light and dark.

### 2. Content pipeline
- **Shared renderer, `src/lib/markdown.ts`:** remark-gfm, footnotes and Shiki (IBM Plex Mono, both themes). Rehype plugins add:
  - the first-paragraph initial letter class;
  - an inline footnote button with `aria-expanded`, plus the notes list at the end;
  - code blocks as regions (`tabindex="0"`, `role="region"`, label, caption from the `title=` meta);
  - `lang` on the article;
  - rehype-sanitize;
  - a `nowMode` that removes images, headings, tables and HTML.
- **Content loader, `src/loaders/firestore.ts`:** an Astro content-layer loader using firebase-admin from `FIREBASE_SERVICE_ACCOUNT` (base64), with the fixture fallback.
- **Computed fields:** reading minutes, Belarusian date formatting with non-breaking spaces, and topics.
- **Feeds and metadata:**
  - RSS per language;
  - `@astrojs/sitemap` with `/admin` excluded;
  - Open Graph images at build time (mark plus title plus post ornament) via satori and resvg.
- **Client JS (small, vanilla):** the footnote toggle and the language toggle memory.

**Verify:** unit tests for the renderer (snapshots of footnotes, initial letter, code region, image removal in `nowMode`); `npm run build` passes with fixtures.

### 3. Admin
- **Shell:** `/admin`, a static page with `noindex` that mounts a Preact island (`src/admin/`).
- **Sign-in:** Google sign-in through Firebase Auth. A wrong account gets "Гэты акаўнт ня мае доступу".
- **Posts:**
  - a list with status and language badges;
  - an editor with BE/EN tabs, each with title, dek and body;
  - topics, a slug preview that freezes after the first publish, and a cover image;
  - CodeMirror 6 (Markdown mode) beside a live preview from the same `markdown.ts` and the site CSS;
  - paste or drop an image → resize in the browser to WebP at 400/800/1600 → signed upload → Markdown inserted.
- **Now:** two Markdown fields, a word count with a warning above 150, and images blocked in the editor and the renderer.
- **About, Work, Projects, Uses:** simple forms and Markdown fields.
- **Publish button:** status changes save straight to Firestore, and Publish calls `/api/publish`. It shows the time of the last deploy.
- **API code:** `src/pages/api/media/sign.ts`, `src/pages/api/publish.ts`, `src/lib/server/auth.ts`, `src/lib/server/r2.ts`.

**Verify:** use the Firebase Emulator Suite locally (Auth and Firestore) to edit a post, upload an image to a dev R2 bucket and press Publish against a dummy hook URL. Also test the rules with `@firebase/rules-unit-testing`.

### 4. Telegram sync (`tools/tg_sync/`, Python 3.12, `requirements.txt`)
- **New session:** `python -m tg_sync login` asks for the phone number, the code and the 2FA password if set. It creates a new Telethon session at `sessions/essentis.session` in the repo root.
  - `sessions/` is listed in `.gitignore` from phase 1, together with `.env` and `tools/tg_sync/.env`.
  - The session file is a login credential: it is never committed and never uploaded anywhere.
- **Login for each run:** `python -m tg_sync`, using `TG_API_ID`, `TG_API_HASH` and `TG_SESSION=sessions/essentis.session`.
- **Fetching:** reads `sync/telegram.lastMessageId` and fetches newer posts from `@essentis`.
- **Albums:** messages are grouped by `grouped_id`.
- **Skips:** posts linking to `essentis.xyz` and posts tagged `#толькітг`.
- **Captions:** "Place // Year" is parsed into `place` and `year`.
- **Photos:** files up to 20 MB are downloaded, made into WebP at 400/800/1600 with Pillow, and uploaded to R2 with boto3. The script then upserts `notes/{firstMsgId}`, so running it twice is safe.
- **Flags:**
  - `--full` re-scans everything, picking up edits and marking deleted posts `hidden`;
  - `--dry-run`;
  - `--publish` calls the deploy hook at the end.
- **Verify:** pytest with a fake Telethon client covering grouping, skip rules and caption parsing; a `--dry-run` against the real channel.

### 5. Seed and launch
- **`tools/seed.py`:**
  - writes the six sample posts as drafts;
  - writes the Now, About and Uses text and the Work and Project placeholders from the drafts;
  - writes the Łacinka post as the first real draft.
- **One-time sync:** `tg_sync --full` imports the channel history.
- **Vercel:** create the project from GitHub `danoctua/essentis`, set the environment variables, the domain `essentis.xyz`, and the deploy hook.
- **CI (GitHub Actions):**
  - `vitest`;
  - `astro build` with fixtures;
  - Playwright screenshots at 390 and 1280 px in both themes;
  - `@axe-core/playwright` checks for contrast, targets and `lang`;
  - a privacy check that fails if `dist/` contains the secret `SURNAME_GUARD`.

### 6. Later, not in this plan
A Telegram bot webhook as a fallback for the sync script, comments, and search.

## Setup README (`README.md`, written in phase 1, completed per phase)

**Firebase:**
1. Create the project in the Spark plan.
2. Create Firestore in Native mode (region `eur3`).
3. Turn on Auth with the Google provider and sign in once to get your `uid`.
4. Download the service account key and add the web app config.
5. Deploy the rules with `firebase deploy --only firestore:rules`.

**Cloudflare R2:**
1. Move essentis.xyz DNS to Cloudflare. Keep the Vercel records: an `A`/`CNAME` record, proxy off.
2. Create the bucket `essentis-media` and connect the custom domain `media.essentis.xyz`.
3. Create an API token with Object Read & Write limited to that bucket.
4. Set a CORS rule allowing `PUT` from `https://essentis.xyz` and `http://localhost:4321`.

**Vercel:**
1. Import the repo.
2. Set the environment variables:
   - `FIREBASE_SERVICE_ACCOUNT`, `PUBLIC_FIREBASE_CONFIG`, `ADMIN_UID`;
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `PUBLIC_MEDIA_URL`;
   - `VERCEL_DEPLOY_HOOK_URL`.
3. Create the deploy hook.
4. Add the domain.

**Telegram:**
1. Get an api id and hash from my.telegram.org and put them in `tools/tg_sync/.env`, with `TG_CHANNEL=essentis` and `TG_SESSION=sessions/essentis.session`.
2. Run `python -m tg_sync login` once to create the session in the git-ignored `sessions/` folder.
3. If the session ever expires or is revoked in Telegram's settings, delete the file and log in again.

## Critical files
- **Reuse:** `src/lib/lat.ts` (`lat`, `slugify`), `src/lib/ornament.ts` (`ornament`, `cross`), `tests/lib.test.ts`, `src/styles/fonts.css` (pattern), and `src/data/ui.ts` (strings and plurals, minus month colours).
- **New:** `src/loaders/firestore.ts`, `src/lib/markdown.ts`, `src/admin/*`, `src/pages/api/*`, `src/lib/server/*`, `firestore.rules`, `tools/tg_sync/*`, `tools/seed.py`, `scripts/tokens.mjs`, `fixtures/*.json`, `.github/workflows/ci.yml`.

## Verification (end to end)
1. **Unit tests:** `npm test` (lat, ornament, slug, markdown); `pytest tools/tg_sync`.
2. **Fixture build:** `npm run build` with fixtures; `npx playwright test` (screenshots and axe).
3. **Emulators:** sign in to `/admin`, create a post in BE, add an EN translation, upload an image, publish, and see the deploy hook called.
4. **Telegram:** `python -m tg_sync --dry-run`, then a real run; a new note shows on Home after a rebuild.
5. **Production smoke test:**
   - essentis.xyz loads in both languages;
   - `/admin` refuses a non-owner account;
   - images load from `media.essentis.xyz`;
   - the RSS feed validates;
   - the privacy check is green.

## Phase 1 notes (done 2026-11-21)

Changes from the plan above, made while building:
- **Content source:** a plain module (`src/lib/content.ts`, loaded once per build) instead of an Astro content-layer loader. Fixtures are used only with `USE_FIXTURES=1`, or on the dev server while no Firebase credentials exist. A build without credentials fails, and a production deploy refuses fixtures.
- **About** has a separate `bio` field: the Home bio and the About intro are different texts.
- **Media `key`** is the base name (`posts/{id}/{hash}`); `-{400|800|1600}.webp` is added when the URL is built. Fixture keys (`fixture/…`) render a placeholder.
- **`@astrojs/rss`** was removed for now; it comes back with the feeds in phase 2.
- **Footnotes** use remark-gfm's default list for now, labelled in the text's language, with a `↩` back-link that breaks the "no arrows" rule. Phase 2's inline footnotes replace both.
- **Type check:** `npm run check` is `tsc` over the `.ts` files. `astro check` does not support TypeScript 7 yet, so `.astro` files are not type-checked.
- **Placeholder years** in Work (`0`) render as `…`.

## Phase 2 notes (done 2026-11-21)

- **Firestore loader:** `src/lib/firestore.ts` reads `posts`, `work`, `projects`, `notes` and `pages/{now,about,uses}` once per build with firebase-admin. Timestamps become ISO strings. `finish()` in `content.ts` is shared by both sources: it drops drafts outside dev, sorts, and **fails the build** on a published post with no title, a bad or duplicate slug, a missing date or an unknown topic, so the live site keeps its previous version. Drafts without a slug get `draft-{id}` on the dev server.
- **Missing content:** no Now note hides the Now block; no posts shows "Допісаў пакуль няма"; empty Work and Projects hide their section. An empty database builds (8 pages).
- **Seed:** `npm run seed` (Node, not Python as first planned: firebase-admin is already a dependency) writes Now, About, Uses, the filled-in Work and Projects entries and the Łacinka post **as a draft**. Placeholders and sample posts are skipped; existing documents are never overwritten. `--dry-run` lists what it would write.
- **Renderer:** Shiki with a css-variables theme (`--code-*` in `global.css`: rust keywords, muted comments, the rest ink). Code is 15 px (drafted 14 px) and footnote markers 15 px (drafted 13 px), so rust text meets the brand's 15 px minimum. Each block is a `figure` with a focusable `role="region"` labelled "Код на Python" and the fence's `title="…"` as caption. The initial letter stays a CSS rule (`.read > p:first-child::first-letter`), no plugin needed.
- **Footnotes:** the ↩ back-links are gone. Without JS a marker links to the list; with JS it becomes a button that opens the note under its paragraph (`aria-expanded`, `aria-controls`). Fixed a phase 1 bug: sanitize prefixed footnote ids twice, so the links went nowhere.
- **RSS:** `/rss.xml` and `/en/rss.xml`, full text, every post as shown on that language's pages. Linked from `<head>` and the footer.
- **OG images:** `/og/{lang}.png` and `/og/{lang}/{slug}.png`, 1200×630, light theme, satori + resvg at build time. satori needs WOFF and one font name per subset to fall back between Latin, Latin Extended and Cyrillic.
- **Tested** against the Firestore emulator: empty database, seed (twice), publish, a broken post failing the build.
