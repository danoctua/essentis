/**
 * The one Markdown renderer, shared by the site build, the RSS feeds and (phase 3) the admin preview.
 *
 * Pipeline: Markdown → GFM → HTML → sanitize → our own plugins → string. Our plugins run after
 * sanitizing, so only trusted markup (Shiki's spans, code regions) is added after the author's
 * input has been cleaned.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { createCssVariablesTheme, createHighlighter, type Highlighter } from 'shiki';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import type { Root as MdRoot, RootContent as MdContent } from 'mdast';
import { ui, type Lang } from '../data/ui';

/** Elements the Now note may not contain: it is plain prose and lists. */
const NOW_BLOCKED = ['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'hr'];

export interface RenderOptions {
  /** Language of the text: footnote labels and code-region names use it. */
  lang: Lang;
  /** Now mode: drop images, headings, tables and code. */
  now?: boolean;
}

// ---------- Code blocks ----------

/** Colours come from CSS variables (--code-*), set in global.css from the brand tokens. */
const theme = createCssVariablesTheme({ name: 'essentis', variablePrefix: '--code-', fontStyle: true });
const LANGS = ['python', 'javascript', 'typescript', 'tsx', 'jsx', 'bash', 'json', 'yaml', 'toml', 'html', 'css', 'sql', 'go', 'rust', 'diff', 'markdown', 'dockerfile'];
const ALIASES: Record<string, string> = { py: 'python', js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', yml: 'yaml', md: 'markdown', docker: 'dockerfile' };
const NAMES: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', tsx: 'TSX', jsx: 'JSX', bash: 'Shell', json: 'JSON',
  yaml: 'YAML', toml: 'TOML', html: 'HTML', css: 'CSS', sql: 'SQL', go: 'Go', rust: 'Rust', diff: 'diff', markdown: 'Markdown', dockerfile: 'Dockerfile',
};
let hl: Promise<Highlighter> | undefined;
const highlighter = () => (hl ??= createHighlighter({ themes: [theme], langs: LANGS }));

/** Keeps the fence's info string (```python title="…") as an attribute, so sanitize lets it through. */
function remarkCodeMeta() {
  return (tree: MdRoot) => {
    const walk = (nodes: MdContent[]) => {
      for (const n of nodes) {
        if (n.type === 'code' && n.meta) n.data = { ...n.data, hProperties: { ...n.data?.hProperties, dataMeta: n.meta } };
        if ('children' in n) walk(n.children as MdContent[]);
      }
    };
    walk(tree.children);
  };
}

const text = (n: ElementContent | RootContent): string =>
  n.type === 'text' ? n.value : 'children' in n ? n.children.map((c) => text(c as ElementContent)).join('') : '';

const el = (tagName: string, properties: Element['properties'], children: ElementContent[]): Element =>
  ({ type: 'element', tagName, properties, children });

/** `title="…"` from the info string becomes the caption. */
export const codeTitle = (meta: unknown) => (typeof meta === 'string' ? /title="([^"]*)"/.exec(meta)?.[1] : undefined);

/**
 * Each fenced block becomes a figure: a focusable, labelled region (it may scroll sideways)
 * with Shiki's highlighted <pre> inside and the title as its caption.
 */
function rehypeCode(textLang: Lang) {
  return async (tree: Root) => {
    const h = await highlighter();
    const visit = (parent: Root | Element) => {
      parent.children.forEach((node, i) => {
        if (node.type !== 'element') return;
        const code = node.tagName === 'pre' && node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
        if (!code) return visit(node);
        const cls = ([] as unknown[]).concat(code.properties.className ?? []).map(String).find((c) => c.startsWith('language-'));
        const asked = cls?.slice('language-'.length).toLowerCase();
        const lang = asked ? (ALIASES[asked] ?? asked) : undefined;
        const known = lang && LANGS.includes(lang) ? lang : undefined;
        const source = text(code).replace(/\n$/, '');
        const pre = h.codeToHast(source, { lang: known ?? 'text', theme: 'essentis' }).children[0] as Element;
        delete pre.properties.tabindex; // the region around it takes focus instead
        const name = known ? NAMES[known] : undefined;
        const title = codeTitle(code.properties.dataMeta);
        const region = el('div', { className: ['code'], tabIndex: 0, role: 'region', ariaLabel: ui[textLang].codeIn(name) }, [pre]);
        parent.children[i] = el('figure', { className: ['code-block'] }, title ? [region, el('figcaption', {}, [{ type: 'text', value: title }])] : [region]);
      });
    };
    visit(tree);
  };
}

// ---------- Footnotes ----------

/**
 * The ↩ back-links go: the brand has no arrows, and on the site each note opens inline
 * (see the script in PostView), so readers never leave the text.
 */
function rehypeFootnotes() {
  return (tree: Root) => {
    const visit = (parent: Root | Element) => {
      parent.children = parent.children.filter((n) => !(n.type === 'element' && n.tagName === 'a' && n.properties.dataFootnoteBackref !== undefined)) as typeof parent.children;
      for (const n of parent.children) if (n.type === 'element') visit(n);
      // Drop the space remark-rehype left before the removed link.
      const last = parent.children.at(-1);
      if (last?.type === 'text' && parent.type === 'element' && parent.tagName === 'p') last.value = last.value.replace(/\s+$/, '');
    };
    visit(tree);
  };
}

// ---------- Render ----------

// remark-rehype already prefixes footnote ids and their links with "user-content-"; sanitize must not
// prefix them again or the links break. Authors cannot set ids (raw HTML is not parsed), so no clobbering is needed.
const base = { ...defaultSchema, clobberPrefix: '' };
const schema = {
  ...base,
  attributes: { ...defaultSchema.attributes, code: [...(defaultSchema.attributes?.code ?? []), 'dataMeta'] },
};
const nowSchema = {
  ...base,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => !NOW_BLOCKED.includes(t)),
  strip: [...(defaultSchema.strip ?? []), ...NOW_BLOCKED],
};

export async function renderMarkdown(src: string, { lang, now = false }: RenderOptions): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCodeMeta)
    .use(remarkRehype, { footnoteLabel: ui[lang].notes })
    .use(rehypeSanitize, now ? nowSchema : schema)
    .use(rehypeFootnotes)
    .use(now ? [] : [[rehypeCode, lang]])
    .use(rehypeStringify)
    .process(src);
  return String(file);
}
