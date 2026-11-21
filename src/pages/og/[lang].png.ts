/** The site's default link preview, one per language. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { ogPng } from '../../lib/og';
import { site } from '../../lib/site';
import { LANGS, ui, type Lang } from '../../data/ui';

export const getStaticPaths = (() => LANGS.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const png = await ogPng({ lang, title: site.owner[lang], sub: ui[lang].tagline });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
