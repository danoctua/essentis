import { slugify } from './lat';

/**
 * The address of a post, made once at first publish from its original title and then frozen.
 * Never empty (a title of only «», emoji or punctuation gives "dopis"), at most 80 characters cut
 * at a word boundary, and unique: "-2", "-3"… is added when another post already has it.
 */
export function makeSlug(title: string, taken: Iterable<string>): string {
  let base = slugify(title) || 'dopis';
  if (base.length > 80) base = base.slice(0, 81).replace(/-[^-]*$/, '') || base.slice(0, 80);
  const used = new Set(taken);
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
