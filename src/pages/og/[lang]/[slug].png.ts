/** Link preview for each post, in each language: the title shown on that page, its gloss and the post ornament. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { ogPng } from '../../../lib/og';
import { getContent } from '../../../lib/content';
import { postView, type PostView } from '../../../lib/view';
import { LANGS, type Lang } from '../../../data/ui';

export const getStaticPaths = (async () => {
  const { posts } = await getContent();
  return LANGS.flatMap((lang) => posts.map((p) => ({ params: { lang, slug: p.slug }, props: { lang, post: postView(p, lang) } })));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { lang, post } = props as { lang: Lang; post: PostView };
  const png = await ogPng({ lang, title: post.title, sub: post.gloss, seed: post.seed });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
