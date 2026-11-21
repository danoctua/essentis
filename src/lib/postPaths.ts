import type { Lang } from '../data/ui';
import { getContent } from './content';
import { postView } from './view';

/** Static paths for every post in one language, with neighbours for prev/next. */
export async function postPaths(lang: Lang) {
  const views = (await getContent()).posts.map((p) => postView(p, lang));
  return views.map((post, i) => ({
    params: { slug: post.slug },
    props: { lang, post, prev: views[i + 1], next: views[i - 1] },
  }));
}
