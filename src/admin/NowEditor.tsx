/** The Now note in both languages: plain prose and lists, no images, ideally under 150 words. */
import { useEffect, useState } from 'preact/hooks';
import { getPage, savePages } from './data';
import { readDraft, useKeep } from './drafts';
import { MdEditor } from './MdEditor';
import { Preview } from './Preview';
import { s } from './strings';
import { Restored, SaveState, TopBar } from './TopBar';
import { onSaveKey, when } from './util';
import { LANGS, type Lang } from '../data/ui';

const count = (t: string) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
type Text = Record<Lang, string>;

export function NowEditor() {
  const [text, setText] = useState<Text | null>(null);
  const [saved, setSaved] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [tab, setTab] = useState<Lang>('be');
  const [rev, setRev] = useState(0);
  const [restored, setRestored] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getPage('now').then((p) => {
      const t: Text = { be: p.be?.body ?? '', en: p.en?.body ?? '' };
      const k = readDraft<Text>('now');
      setSaved(JSON.stringify(t)); setText(k ? { ...t, ...k.data } : t); setRestored(k?.at ?? ''); setUpdatedAt(p.updatedAt);
    }, (e) => setErr(e.message));
  }, []);
  const dirty = !!text && JSON.stringify(text) !== saved;
  const { kept } = useKeep(text && 'now', text, dirty);

  const save = async () => {
    if (!text || busy) return;
    setBusy(true); setErr('');
    try {
      await savePages({ now: { be: { body: text.be.trim() }, en: { body: text.en.trim() } } });
      setSaved(JSON.stringify(text)); setUpdatedAt(new Date().toISOString()); setRestored(''); setDone(true);
    } catch (e) { setErr(`${s.error}: ${(e as Error).message}`); }
    setBusy(false);
  };
  useEffect(() => onSaveKey(save), [text, busy]);
  const n = text ? count(text[tab]) : 0;

  return (
    <div class="editor">
      <TopBar title={s.now} error={err} status={<SaveState dirty={dirty} busy={busy} kept={kept} saved={done} />}
        notice={restored && dirty && <Restored at={restored} onDiscard={() => { setText(JSON.parse(saved)); setRev(rev + 1); setRestored(''); }} />}>
        <button type="button" class="btn primary" onClick={save} disabled={!dirty || busy}>{s.save}</button>
      </TopBar>
      {!text ? !err && <p>{s.loading}</p> : (
        <>
          <div class="ed-main">
            <div class="tabs" role="group">
              {LANGS.map((l) => <button type="button" aria-pressed={tab === l} onClick={() => setTab(l)}>{s.langTab[l]}</button>)}
            </div>
            <MdEditor key={`${tab}-${rev}`} value={text[tab]} lang={tab} onChange={(v) => setText((c) => c && { ...c, [tab]: v })} label={`${s.now}, ${s.langTab[tab]}`} onError={setErr} minHeight={200} />
            <p class={n > 150 ? 'err' : 'hint'}>{s.words(n)}{n > 150 ? `. ${s.nowTooLong}` : ''}</p>
            <p class="hint">{s.nowHint} {s.updated} {when(updatedAt)}.</p>
          </div>
          <aside class="ed-preview" aria-label={s.preview}>
            <div class="now-preview"><Preview md={text[tab]} lang={tab} now /></div>
          </aside>
        </>
      )}
    </div>
  );
}
