/**
 * The one Markdown renderer, shared by the site build and (phase 3) the admin preview.
 * Phase 2 adds Shiki, inline footnote toggles, code regions and the initial-letter plugin.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { ui, type Lang } from '../data/ui';

/** Elements the Now note may not contain: it is plain prose and lists. */
const NOW_BLOCKED = ['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'hr'];

export interface RenderOptions {
  /** Language of the text, used for footnote labels. */
  lang: Lang;
  /** Now mode: drop images, headings, tables and code. */
  now?: boolean;
}

export async function renderMarkdown(src: string, { lang, now = false }: RenderOptions): Promise<string> {
  const schema = now
    ? { ...defaultSchema, tagNames: (defaultSchema.tagNames ?? []).filter((t) => !NOW_BLOCKED.includes(t)), strip: [...(defaultSchema.strip ?? []), ...NOW_BLOCKED] }
    : defaultSchema;
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { footnoteLabel: ui[lang].notes, footnoteBackLabel: ui[lang].backToText })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(src);
  return String(file);
}
