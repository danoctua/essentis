/** RSS for one language: every published post, as shown on that language's pages, with the full text. */
import rss from '@astrojs/rss';
import { getContent } from './content';
import { renderMarkdown } from './markdown';
import { routes } from './routes';
import { site } from './site';
import { postView } from './view';
import { topicLabels, ui, type Lang } from '../data/ui';

export const feeds: Record<Lang, string> = { be: '/rss.xml', en: '/en/rss.xml' };

export async function feed(lang: Lang) {
  const t = ui[lang];
  const posts = (await getContent()).posts.map((p) => postView(p, lang));
  return rss({
    title: t.feedTitle,
    description: t.siteDescription,
    site: new URL(routes.home[lang], site.url).href,
    customData: `<language>${lang}</language>`,
    items: await Promise.all(posts.map(async (p) => ({
      title: p.title,
      link: p.url,
      pubDate: p.date,
      description: p.dek,
      content: await renderMarkdown(p.body, { lang: p.lang }),
      categories: p.topics.map((k) => topicLabels[lang][k]),
      customData: p.foreign ? `<dc:language>${p.lang}</dc:language>` : undefined,
    }))),
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
  });
}
