/**
 * One-line texts (Work lines, project texts) are plain text with optional Markdown links:
 * `[label](https://…)`. Everything else is escaped, so these fields can never carry HTML.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s()]+)\)/g;

export function inlineLinks(text: string): string {
  let out = '', last = 0;
  for (const m of text.matchAll(LINK)) {
    out += esc(text.slice(last, m.index)) + `<a href="${esc(m[2])}">${esc(m[1])}</a>`;
    last = m.index! + m[0].length;
  }
  return out + esc(text.slice(last));
}
