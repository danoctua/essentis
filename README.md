# essentis.xyz

Personal site and blog of Daniił M. Astro, static, on Vercel. Content lives in Firestore and is edited in `/admin/`; photos live in Cloudflare R2. Belarusian at `/`, English at `/en/`.

- Brand book: `design/brand-book.md` (tokens in `design/tokens.json`, page structure in `design/pages.md`).
- Build plan and phases: `docs/PLAN.md`.

**Privacy rule.** The owner's surname never appears anywhere: text, meta tags, alt text, file names, structured data. Use "Daniił M." / "Данііл М.".

## Working locally

```sh
npm install
npm run dev              # sample content from fixtures/, no credentials needed
npm test                 # unit tests
npm run build:fixtures   # full static build with sample content
```

A plain `npm run build` reads Firestore and fails without `FIREBASE_SERVICE_ACCOUNT`, so a deploy can never ship sample posts. A production deploy also refuses `USE_FIXTURES`. With `FIREBASE_SERVICE_ACCOUNT` in `.env`, `npm run dev` shows your real content, drafts included (restart it after edits); `npm run build && npm run preview` serves exactly what production will.

### The admin locally

`/admin/` needs `PUBLIC_FIREBASE_CONFIG` in `.env` and talks to the real Firestore, so changes there are real. To try things safely, use the emulators instead (Java required):

```sh
npm run emulators          # terminal 1: local Auth + Firestore with firestore.rules
npm run dev:emulators      # terminal 2: dev server wired to them
# sign in at http://localhost:4321/admin/ with any made-up account, then:
FIREBASE_SERVICE_ACCOUNT= FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run admin:grant -- that@email
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test   # also runs the Firestore rules tests
```

Image uploads and "Абнавіць сайт" need the R2 and deploy-hook variables; without them the API answers "not configured" (503).

### First content in Firestore

`npm run seed -- --dry-run` lists what would be written; `npm run seed` writes it. It needs `FIREBASE_SERVICE_ACCOUNT` in `.env`, creates only documents that do not exist yet, and adds the Łacinka post as a draft: set its `status` to `published` in the Firebase console (or, from phase 3, in `/admin`) when it should go live.

To try changes against a local database instead, run the Firestore emulator (`npx firebase-tools emulators:start --only firestore --project demo-essentis`) and set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (or the port it prints) before `npm run seed` or `npm run build`.

Regenerate generated files after changing their source:

- `npm run tokens` writes `src/styles/tokens.css` from `design/tokens.json`.
- `npm run fonts` copies the font subsets into `public/fonts` and writes `src/styles/fonts.css`.

## Layout

| Path | What |
| --- | --- |
| `src/views/` | One view per page type, shared by both languages |
| `src/pages/` | Thin route files: `/`, `/dopisy/`, `/pra-mianie/`, `/ciapier/` and their `/en/` twins |
| `src/lib/routes.ts` | Every URL in both languages. Use it; never swap a prefix |
| `src/lib/content.ts` | Content types and the source switch (fixtures or Firestore) |
| `src/lib/view.ts` | What a page in one language shows: translation or original with a gloss |
| `src/lib/markdown.ts` | The one Markdown renderer (site and admin preview) |
| `src/lib/graphics.ts`, `ornament.ts` | Mark, avatar, woven band, divider, per-post ornament |
| `fixtures/` | Sample content for dev and CI only |
| `src/lib/firestore.ts` | Reads Firestore at build time |
| `src/lib/og.ts`, `src/pages/og/` | Link preview images |
| `src/lib/feed.ts` | RSS feeds (`/rss.xml`, `/en/rss.xml`) |
| `scripts/seed.mjs` | Writes the first content into an empty Firestore |
| `src/admin/` | The admin app (Preact), mounted on `/admin/` |
| `src/pages/api/` | The admin's two server routes: image upload URLs and "update site" |
| `firestore.rules` | Only an account with the `admin` claim may read or write |
| `tools/` | Telegram sync (Python, phase 4) |
| `sessions/` | Telethon login session. Git-ignored; never commit or upload it |

## Setup: what to configure, what to provide, and where

Do these once. Values go into Vercel (Project → Settings → Environment Variables) and, for local scripts, into `.env` / `tools/tg_sync/.env` (both git-ignored). See `.env.example`.

### 1. Firebase (free Spark plan)

1. Create a project at console.firebase.google.com. Keep it on the Spark plan; Analytics is not needed.
2. Firestore Database → Create → Native mode, location `eur3 (europe-west)`.
3. Authentication → Get started → enable the **Google** provider.
4. Project settings → General → Your apps → add a **Web app** (no hosting). Copy its config object; it becomes `PUBLIC_FIREBASE_CONFIG` (one-line JSON). This config is public by design.
5. Project settings → Service accounts → Generate new private key. Base64 it (`base64 -w0 key.json`) and store the result as `FIREBASE_SERVICE_ACCOUNT`. Then delete the downloaded file. This one is secret.
6. Authentication → Settings → Authorized domains: add `essentis.xyz` (and `www.essentis.xyz`). `localhost` is there already.
7. Publish the rules: Firestore Database → Rules, replace everything with the contents of `firestore.rules`, Publish. (Or `npx firebase-tools login` once, then `npx firebase-tools deploy --only firestore:rules`.) They let in only an account with the `admin` claim.
8. Sign in at `/admin/` once with your Google account; it says the account has no access. Then give it access from this folder: `npm run admin:grant -- you@gmail.com`, and press «Праверыць зноў».

### 2. Cloudflare: DNS and R2

1. Add `essentis.xyz` to Cloudflare (Websites → Add a site, Free plan) and change the nameservers at your registrar to the two Cloudflare gives you. Wait until Cloudflare says the site is active.
2. In Cloudflare DNS, add the records Vercel asks for in step 3.4 (an `A` record for `essentis.xyz` and a `CNAME` for `www`) with the proxy **off** (grey cloud), so Vercel serves the site and issues its certificate.
3. R2 → Create bucket `essentis-media` (location: automatic, Eastern Europe hint is fine).
4. Bucket → Settings → Custom domains → connect `media.essentis.xyz`. Cloudflare creates the DNS record. This is the public address of every photo (`PUBLIC_MEDIA_URL=https://media.essentis.xyz`).
5. Bucket → Settings → CORS policy:
   ```json
   [{ "AllowedOrigins": ["https://essentis.xyz", "http://localhost:4321"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
6. R2 → Manage API tokens → Create token: **Object Read & Write**, limited to `essentis-media`. Copy the Access Key ID, Secret Access Key and your Account ID: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, plus `R2_BUCKET=essentis-media`.

### 3. Vercel (Hobby, non-commercial)

1. Push this repo to GitHub (`danoctua/essentis`) and import it at vercel.com/new. Framework: Astro. Build command and output are detected.
2. Add the environment variables: `FIREBASE_SERVICE_ACCOUNT`, `PUBLIC_FIREBASE_CONFIG`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `PUBLIC_MEDIA_URL`, `VERCEL_DEPLOY_HOOK_URL`. Never add `USE_FIXTURES`.
3. Settings → Git → Deploy Hooks → create one named `publish` on branch `main`. Its URL is `VERCEL_DEPLOY_HOOK_URL` (secret: anyone with it can trigger builds).
4. Settings → Domains → add `essentis.xyz` (and `www.essentis.xyz` redirecting to it). Put the records it shows into Cloudflare DNS, proxy off.

### 4. Telegram (local sync script, phase 4)

1. my.telegram.org → API development tools → create an app. Put `TG_API_ID` and `TG_API_HASH` in `tools/tg_sync/.env`, with `TG_CHANNEL=essentis` and `TG_SESSION=sessions/essentis.session`.
2. Run `python -m tg_sync login` once. It asks for your phone number, the code and your 2FA password, and creates the session in the git-ignored `sessions/` folder.
3. If the session expires or you end it in Telegram → Settings → Devices, delete the file and log in again.
