/** Live preview with the site's own renderer and CSS. Loaded lazily: Shiki is large. */
import { useEffect, useState } from 'preact/hooks';
import type { Lang } from '../data/ui';

interface Props { md: string; lang: Lang; now?: boolean; title?: string; dek?: string }

export function Preview({ md, lang, now = false, title, dek }: Props) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      const { renderMarkdown } = await import('../lib/markdown');
      const out = await renderMarkdown(md, { lang, now });
      if (live) setHtml(out);
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [md, lang, now]);
  return (
    <div class="preview" lang={lang}>
      {title && <h1 class="page-title">{title}</h1>}
      {dek && <p class="preview-dek">{dek}</p>}
      <div class={now ? 'prose' : 'read'} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
