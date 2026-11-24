/** About page texts (pages/about) and Uses (pages/uses), in both languages. One section open at a time. */
import { useEffect, useState } from 'preact/hooks';
import { getPage, savePages } from './data';
import { readDraft, useKeep } from './drafts';
import { MdEditor } from './MdEditor';
import { s } from './strings';
import { Restored, SaveState, TopBar } from './TopBar';
import { glimpse, onSaveKey } from './util';
import { LANGS, type Lang } from '../data/ui';
import type { AboutText } from '../lib/content';

type Texts = Record<Lang, AboutText & { uses: string }>;
const FIELDS = ['bio', 'intro', 'meaning', 'workSummary', 'uses'] as const;
type Field = (typeof FIELDS)[number];
const empty = (): AboutText & { uses: string } => ({ bio: '', intro: '', meaning: '', workSummary: '', uses: '' });

export function AboutEditor() {
  const [t, setT] = useState<Texts | null>(null);
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState<Lang>('be');
  const [open, setOpen] = useState<Field | null>(null);
  const [rev, setRev] = useState(0);
  const [restored, setRestored] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([getPage('about'), getPage('uses')]).then(([about, uses]) => {
      const x = Object.fromEntries(LANGS.map((l) => [l, { ...empty(), ...about[l], uses: uses[l]?.body ?? '' }])) as Texts;
      const k = readDraft<Texts>('about');
      setSaved(JSON.stringify(x)); setT(k ? { ...x, ...k.data } : x); setRestored(k?.at ?? '');
    }, (e) => setErr(e.message));
  }, []);
  const dirty = !!t && JSON.stringify(t) !== saved;
  const { kept } = useKeep(t && 'about', t, dirty);

  const save = async () => {
    if (!t || busy) return;
    setBusy(true); setErr('');
    try {
      const about = Object.fromEntries(LANGS.map((l) => { const { uses, ...rest } = t[l]; return [l, rest]; }));
      const uses = Object.fromEntries(LANGS.map((l) => [l, { body: t[l].uses }]));
      await savePages({ about, uses });
      setSaved(JSON.stringify(t)); setRestored(''); setDone(true);
    } catch (e) { setErr(`${s.error}: ${(e as Error).message}`); }
    setBusy(false);
  };
  useEffect(() => onSaveKey(save), [t, busy]);
  // Closing the section above moves this one up: bring its heading back into view.
  useEffect(() => { if (open) document.getElementById(`sec-${open}`)?.scrollIntoView({ block: 'nearest' }); }, [open]);

  return (
    <div class="form-page">
      <TopBar title={s.about} error={err} status={<SaveState dirty={dirty} busy={busy} kept={kept} saved={done} />}
        notice={restored && dirty && <Restored at={restored} onDiscard={() => { setT(JSON.parse(saved)); setRev(rev + 1); setRestored(''); }} />}>
        <button type="button" class="btn primary" onClick={save} disabled={!dirty || busy}>{s.save}</button>
      </TopBar>
      {!t ? !err && <p>{s.loading}</p> : (
        <>
          <div class="tabs" role="group">
            {LANGS.map((l) => <button type="button" aria-pressed={tab === l} onClick={() => setTab(l)}>{s.langTab[l]}</button>)}
          </div>
          {FIELDS.map((f) => (
            <section class="fold" id={`sec-${f}`}>
              <h2><button type="button" class="fold-head" aria-expanded={open === f} onClick={() => setOpen(open === f ? null : f)}>
                <span class="ttl">{s[f]}</span>
                {open !== f && <span class="meta" lang={tab}>{glimpse(t[tab][f] ?? '') || '…'}</span>}
              </button></h2>
              {open === f && <MdEditor key={`${tab}-${f}-${rev}`} value={t[tab][f] ?? ''} lang={tab} onChange={(v) => setT((c) => c && { ...c, [tab]: { ...c[tab], [f]: v } })} label={`${s[f]}, ${s.langTab[tab]}`} onError={setErr} minHeight={110} />}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
