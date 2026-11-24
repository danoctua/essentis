import { albums } from './albums';
import { getContent } from './content';
import type { Lang } from '../data/ui';

export async function albumPaths(lang: Lang) {
  return albums((await getContent()).notes).map((album) => ({ params: { slug: album.slug }, props: { lang, album } }));
}
