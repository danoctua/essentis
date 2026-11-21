/** Cyrillic (Belarusian) -> Łacinka. Port of the handoff algorithm; keep stable. */
export function lat(text: string): string {
  const B: Record<string, string> = {а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',ж:'ž',з:'z',й:'j',к:'k',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ў:'ŭ',ф:'f',х:'ch',ц:'c',ч:'č',ш:'š',ы:'y',э:'e'};
  const SOFT: Record<string, string> = {з:'ź',с:'ś',н:'ń',ц:'ć'};
  const IOT: Record<string, string> = {е:'e',ё:'o',ю:'u',я:'a'};
  const VOW = 'аеёіоуыэюя';
  const isCyr = (c: string) => /[Ѐ-ӿ]/.test(c);
  const isUp = (c?: string) => !!c && c !== c.toLowerCase();
  const ch = [...text];
  let out = '';
  for (let i = 0; i < ch.length; i++) {
    const C = ch[i], c = C.toLowerCase();
    if (!isCyr(C) && c !== "'" && c !== '’') { out += C; continue; }
    const p = (ch[i - 1] || '').toLowerCase(), n = (ch[i + 1] || '').toLowerCase();
    let r = '';
    if (c === 'ь' || c === "'" || c === '’') {
      if (c !== 'ь' && !(isCyr(ch[i - 1] || '') && isCyr(ch[i + 1] || ''))) r = C;
    } else if (c === 'л') r = n !== '' && 'ьіеёюя'.includes(n) ? 'l' : 'ł';
    else if (SOFT[c] && n === 'ь') r = SOFT[c];
    else if (IOT[c]) {
      const start = !isCyr(ch[i - 1] || '') || (p && VOW.includes(p)) || p === 'ь' || p === "'" || p === '’' || p === 'ў';
      r = start ? 'j' + IOT[c] : (p === 'л' ? IOT[c] : 'i' + IOT[c]);
    } else if (c === 'і') r = (p && VOW.includes(p) && p !== 'і') || p === "'" || p === '’' ? 'ji' : 'i';
    else r = B[c] || C;
    if (isUp(C) && r) {
      const allUp = (isUp(ch[i + 1]) && isCyr(ch[i + 1])) || (isUp(ch[i - 1]) && isCyr(ch[i - 1]));
      r = allUp ? r.toUpperCase() : r[0].toUpperCase() + r.slice(1);
    }
    out += r;
  }
  return out;
}

/** Łacinka -> ASCII for URL slugs (decided: ASCII-folded). */
export function slugify(text: string): string {
  return lat(text)
    .replace(/ł/gi, 'l').replace(/ŭ/gi, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
