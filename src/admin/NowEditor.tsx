/** The Now note in both languages: plain prose and lists, no images, ideally under 150 words. */
import { useEffect, useState } from 'preact/hooks';
import { getPage, savePage } from './data';
import { MdEditor } from './MdEditor';
import { Preview } from './Preview';
import { s } from './strings';
import { onSaveKey, unsaved, when } from './util';
import { LANGS, type Lang } from '../data/ui';

const count = (t: string) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export function NowEditor() {
  const [text, setText] = useState<Record<Lang, string> | null>(null);
  const [saved, setSaved] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [tab, setTab] = useState<Lang>('be');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    getPage('now').then((p) => {
      const t = { be: p.be?.body ?? '', en: p.en?.body ?? '' };
      setText(t); setSaved(JSON.stringify(t)); setUpdatedAt(p.updatedAt);
    }, (e) => setMsg({ text: e.message, bad: true }));
  }, []);
  const dirty = !!text && JSON.stringify(text) !== saved;
  unsaved.current = dirty;
  useEffect(() => () => { unsaved.current = false; }, []);

  const save = async () => {
    if (!text) return;
    try {
      await savePage('now', { be: { body: text.be.trim() }, en: { body: text.en.trim() } });
      setSaved(JSON.stringify(text)); setUpdatedAt(new Date().toISOString()); setMsg({ text: s.saved });
    } catch (e) { setMsg({ text: `${s.error}: ${(e as Error).message}`, bad: true }); }
  };
  useEffect(() => onSaveKey(save), [text]);
  if (!text) return <p class={msg?.bad ? 'err' : ''}>{msg?.text ?? s.loading}</p>;
  const n = count(text[tab]);

  return (
    <div class="editor">
      <div class="ed-bar">
        <h1 class="page-title">{s.now}</h1>
        <span class="hint" role="status">{dirty ? s.unsaved : msg && !msg.bad ? msg.text : `${s.updated} ${when(updatedAt)}`}</span>
        <span class="grow" />
        <button type="button" class="btn primary" onClick={save} disabled={!dirty}>{s.save}</button>
      </div>
      {msg?.bad && <p class="err" role="alert">{msg.text}</p>}
      <div class="ed-main">
        <p class="hint">{s.nowHint}</p>
        <div class="tabs" role="tablist">
          {LANGS.map((l) => <button type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}>{s.langTab[l]}</button>)}
        </div>
        <MdEditor key={tab} value={text[tab]} onChange={(v) => setText({ ...text, [tab]: v })} label={`${s.now}, ${s.langTab[tab]}`} onError={(t) => setMsg({ text: t, bad: true })} minHeight={200} />
        <p class={n > 150 ? 'err' : 'hint'}>{s.words(n)}{n > 150 ? `. ${s.nowTooLong}` : ''}</p>
      </div>
      <aside class="ed-preview" aria-label={s.preview}>
        <div class="now-preview"><Preview md={text[tab]} lang={tab} now /></div>
      </aside>
    </div>
  );
}
