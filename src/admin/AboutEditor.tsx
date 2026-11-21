/** About page texts (pages/about) and Uses (pages/uses), in both languages. */
import { useEffect, useState } from 'preact/hooks';
import { getPage, savePage } from './data';
import { MdEditor } from './MdEditor';
import { s } from './strings';
import { onSaveKey, unsaved } from './util';
import { LANGS, type Lang } from '../data/ui';
import type { AboutText } from '../lib/content';

type Texts = Record<Lang, AboutText & { uses: string }>;
const FIELDS = ['bio', 'intro', 'meaning', 'workSummary', 'uses'] as const;
const empty = (): AboutText & { uses: string } => ({ bio: '', intro: '', meaning: '', workSummary: '', uses: '' });

export function AboutEditor() {
  const [t, setT] = useState<Texts | null>(null);
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState<Lang>('be');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([getPage('about'), getPage('uses')]).then(([about, uses]) => {
      const x = Object.fromEntries(LANGS.map((l) => [l, { ...empty(), ...about[l], uses: uses[l]?.body ?? '' }])) as Texts;
      setT(x); setSaved(JSON.stringify(x));
    }, (e) => setMsg({ text: e.message, bad: true }));
  }, []);
  const dirty = !!t && JSON.stringify(t) !== saved;
  unsaved.current = dirty;
  useEffect(() => () => { unsaved.current = false; }, []);

  const save = async () => {
    if (!t) return;
    try {
      const about = Object.fromEntries(LANGS.map((l) => { const { uses, ...rest } = t[l]; return [l, rest]; }));
      const uses = Object.fromEntries(LANGS.map((l) => [l, { body: t[l].uses }]));
      await Promise.all([savePage('about', about), savePage('uses', uses)]);
      setSaved(JSON.stringify(t)); setMsg({ text: s.saved });
    } catch (e) { setMsg({ text: `${s.error}: ${(e as Error).message}`, bad: true }); }
  };
  useEffect(() => onSaveKey(save), [t]);
  if (!t) return <p class={msg?.bad ? 'err' : ''}>{msg?.text ?? s.loading}</p>;

  return (
    <div class="form-page">
      <div class="ed-bar">
        <h1 class="page-title">{s.about}</h1>
        <span class="hint" role="status">{dirty ? s.unsaved : msg && !msg.bad ? msg.text : ''}</span>
        <span class="grow" />
        <button type="button" class="btn primary" onClick={save} disabled={!dirty}>{s.save}</button>
      </div>
      {msg?.bad && <p class="err" role="alert">{msg.text}</p>}
      <div class="tabs" role="tablist">
        {LANGS.map((l) => <button type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}>{s.langTab[l]}</button>)}
      </div>
      {FIELDS.map((f) => (
        <div class="field">
          <span class="label">{s[f]}</span>
          <MdEditor key={`${tab}-${f}`} value={t[tab][f]} onChange={(v) => setT({ ...t, [tab]: { ...t[tab], [f]: v } })} label={`${s[f]}, ${s.langTab[tab]}`} onError={(x) => setMsg({ text: x, bad: true })} minHeight={f === 'bio' ? 60 : 110} />
        </div>
      ))}
    </div>
  );
}
