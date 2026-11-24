# Pages and content

How the brand maps onto the site. Belarusian is the default language at `/`, English lives at `/en/`, and every page exists in both.

## Site map

| Page | BE / EN | What it holds |
| --- | --- | --- |
| Home `/` | Галоўная / Home | Name, a short personal bio, the Now block, the latest four posts, the latest four photo albums, links |
| Writing `/dopisy/` | Допісы / Writing | Every long read, newest first, grouped by year, with a topic filter |
| Post `/dopisy/<slug>/` | | One long read |
| Photos `/fota/` | Фота / Photos | Channel albums with a "Place // Year" caption, by year: square covers, place, photo count |
| Album `/fota/<place-year>/` | | Every post about one place and year: captions, uncropped photos in even rows, a full-screen viewer, a link to each post on Telegram |
| About `/pra-mianie/` | Пра мяне / About | Who I am, the mark's meaning, work (summary, by years, example projects), Uses |

Navigation shows Допісы, Фота, Пра мяне (Writing, Photos, About) and the language switch. The mark and wordmark link Home. Slugs are ASCII-folded Łacinka.

## The Now note

A single Markdown document edited in the admin, with an "updated" date set on save.

- Allowed: paragraphs, bullet lists, links, bold and italic. No images, headings, tables or embeds; the renderer drops them.
- Length: aim for 60 to 120 words. The admin warns above 150.
- Where it shows: in full on Home, in a `paper-raised` block beside the intro on desktop and right after it on mobile, headed "Цяпер" with "Абноўлена 19 лістапада" underneath. There is no separate Now page (removed 2026-11-24); `/ciapier/` and `/en/now/` redirect to Home.
- One version per language; if the English one is missing, the English site shows the Belarusian text with `lang="be"` and a note that it has not been translated.

## The short bio

The bio on Home is about the person, not the job: two or three sentences. Work gets one clause at most; the full career story lives in one place, the Work section of About.

Draft built from what the owner has shared (to be replaced with his own words):

> **BE.** Беларус, які жыве ў Польшчы. Інжынер, муж, чытач Бахарэвіча і Караткевіча. Слухаю ўсё ад фолку да рэпу і вандрую.
>
> **EN.** A Belarusian living in Poland. Engineer, husband, reader of Bakharevich and Karatkevich. I listen to everything from folk to rap, and I travel.

## Home layout (chosen: A)

Header, then the avatar and name with the bio on the left and the Now block beside it on desktop (stacked on mobile), then the woven band across the full width, then the latest four posts on the left and the channel albums with photo thumbnails on the right, then the divider and footer. Keep it focused: no further sections on Home.

## About page structure

1. **Who I am.** A few short paragraphs in first person: Belarusian roots and language, life in Poland, family, books, music, travel, the channel.
2. **Why essentis.** The mark's meaning, from the brand book.
3. **Work.** The only place for career:
   - a two-sentence summary;
   - a list by years (year range, role, company, one line on what changed);
   - three to five example projects, each with a sentence on the problem and what was built.
4. **Uses.** Tools and habits, one short list.
5. **Links.** Channel, Telegram, GitHub, LinkedIn, email.

## Post lists

Each row: the post ornament (or a cover photo, cropped square), the title in the post's own language with its `lang`, a gloss in the interface language when they differ, and one meta line: "12 лістапада, па-англійску, 6 хв". No cards, no excerpts on Home; Writing may show the dek.
