/** Work history and projects for About › Work. Order is the list order; saved in one batch. One entry open at a time. */
import { useEffect, useState } from 'preact/hooks';
import { getList, newId, saveLists } from './data';
import { readDraft, useKeep } from './drafts';
import { Grow } from './Grow';
import { s } from './strings';
import { Restored, SaveState, TopBar } from './TopBar';
import { onSaveKey } from './util';
import { LANGS } from '../data/ui';
import type { Project, Work } from '../lib/content';

type Kind = 'work' | 'projects';
/** Entries in `gone` stay in their list, so they can be brought back, until the save that deletes them. */
interface Lists { work: Work[]; projects: Project[]; gone: string[] }

const move = <T,>(xs: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= xs.length) return xs;
  const out = [...xs];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};
const year = (v: string) => (v.trim() ? Number.parseInt(v, 10) || 0 : null);
const without = (c: Lists, ids: string[]): Lists => ({
  work: c.work.filter((x) => !ids.includes(x.id)), projects: c.projects.filter((x) => !ids.includes(x.id)), gone: c.gone.filter((id) => !ids.includes(id)),
});

export function WorkEditor() {
  const [l, setL] = useState<Lists | null>(null);
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState('');
  const [restored, setRestored] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([getList('work'), getList('projects')]).then(([work, projects]) => {
      const x: Lists = { work, projects, gone: [] };
      const k = readDraft<Lists>('work');
      setSaved(JSON.stringify(x)); setL(k ? { ...x, ...k.data } : x); setRestored(k?.at ?? '');
    }, (e) => setErr(e.message));
  }, []);
  const dirty = !!l && JSON.stringify(l) !== saved;
  const { kept } = useKeep(l && 'work', l, dirty);

  const save = async () => {
    if (!l || busy) return;
    setBusy(true); setErr('');
    try {
      await saveLists({ work: l.work, projects: l.projects }, l.gone);
      // Anything typed or removed while the save was running stays.
      setL((c) => c && without(c, l.gone)); setSaved(JSON.stringify(without(l, l.gone))); setRestored(''); setDone(true);
    } catch (e) { setErr(`${s.error}: ${(e as Error).message}`); }
    setBusy(false);
  };
  useEffect(() => onSaveKey(save), [l, busy]);
  useEffect(() => { if (open) document.getElementById(`e-${open}`)?.scrollIntoView({ block: 'nearest' }); }, [open]);

  const edit = (f: (c: Lists) => Lists) => setL((c) => c && f(c));
  const patch = <K extends Kind>(kind: K, id: string, p: Partial<Lists[K][number]>) =>
    edit((c) => ({ ...c, [kind]: (c[kind] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const add = (kind: Kind) => {
    const id = newId(kind);
    edit((c) => (kind === 'work'
      ? { ...c, work: [...c.work, { id, from: new Date().getFullYear(), to: null, role: '', company: '', line: {}, order: c.work.length }] }
      : { ...c, projects: [...c.projects, { id, name: '', text: {}, order: c.projects.length }] }));
    setOpen(id);
  };

  const entry = (kind: Kind, i: number, id: string, title: string, meta: string, body: preact.ComponentChildren) => {
    const gone = l!.gone.includes(id), size = l![kind].length;
    return (
      <section class="fold" id={`e-${id}`} key={id}>
        <div class="fold-row">
          <h3><button type="button" class="fold-head" aria-expanded={open === id} disabled={gone} onClick={() => setOpen(open === id ? '' : id)}>
            <span class={gone ? 'ttl gone' : 'ttl'}>{title}</span>
            <span class="meta">{gone ? s.removed : meta}</span>
          </button></h3>
          {gone ? <button type="button" class="btn" onClick={() => edit((c) => ({ ...c, gone: c.gone.filter((x) => x !== id) }))}>{s.undo}</button> : (
            <>
              <button type="button" class="icon" aria-label={`${s.up}: ${title}`} disabled={i === 0} onClick={() => edit((c) => ({ ...c, [kind]: move(c[kind] as unknown[], i, -1) }))}><span aria-hidden="true">↑</span></button>
              <button type="button" class="icon" aria-label={`${s.down}: ${title}`} disabled={i === size - 1} onClick={() => edit((c) => ({ ...c, [kind]: move(c[kind] as unknown[], i, 1) }))}><span aria-hidden="true">↓</span></button>
            </>
          )}
        </div>
        {open === id && !gone && (
          <div class="fold-body">
            {body}
            <button type="button" class="btn danger" onClick={() => { edit((c) => ({ ...c, gone: [...c.gone, id] })); setOpen(''); }}>{s.remove}</button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div class="form-page">
      <TopBar title={s.workShort} error={err} status={<SaveState dirty={dirty} busy={busy} kept={kept} saved={done} />}
        notice={restored && dirty && <Restored at={restored} onDiscard={() => { setL(JSON.parse(saved)); setRestored(''); }} />}>
        <button type="button" class="btn primary" onClick={save} disabled={!dirty || busy}>{s.save}</button>
      </TopBar>
      {!l ? !err && <p>{s.loading}</p> : (
        <>
          <h2 class="h2">{s.workList}</h2>
          {l.work.map((w, i) => entry('work', i, w.id, [w.role || s.role, w.company || s.company].join(', '), [w.from, w.to ?? s.today].join('–'), (
            <>
              <div class="grid2 narrow">
                <label>{s.from}<input type="number" inputMode="numeric" value={w.from || ''} onInput={(e) => patch('work', w.id, { from: year(e.currentTarget.value) ?? 0 })} /></label>
                <label>{s.to}<input type="number" inputMode="numeric" value={w.to ?? ''} placeholder={s.today} onInput={(e) => patch('work', w.id, { to: year(e.currentTarget.value) })} /></label>
              </div>
              <div class="grid2">
                <label>{s.role}<input type="text" value={w.role} onInput={(e) => patch('work', w.id, { role: e.currentTarget.value })} /></label>
                <label>{s.company}<input type="text" value={w.company} onInput={(e) => patch('work', w.id, { company: e.currentTarget.value })} /></label>
              </div>
              {LANGS.map((g) => <label>{s.line}, {s.langTab[g].toLowerCase()}<Grow lang={g} value={w.line[g] ?? ''} onInput={(v) => patch('work', w.id, { line: { ...w.line, [g]: v } })} /></label>)}
            </>
          )))}
          <p><button type="button" class="btn" onClick={() => add('work')}>{s.addWork}</button></p>

          <h2 class="h2">{s.projects}</h2>
          <p class="hint">{s.linksHint}</p>
          {l.projects.map((p, i) => entry('projects', i, p.id, p.name || s.name, (p.url ?? '').replace(/^https?:\/\//, ''), (
            <>
              <div class="grid2">
                <label>{s.name}<input type="text" value={p.name} onInput={(e) => patch('projects', p.id, { name: e.currentTarget.value })} /></label>
                <label>{s.url}<input type="url" value={p.url ?? ''} onInput={(e) => patch('projects', p.id, { url: e.currentTarget.value || undefined })} /></label>
              </div>
              {LANGS.map((g) => <label>{s.text}, {s.langTab[g].toLowerCase()}<Grow lang={g} value={p.text[g] ?? ''} onInput={(v) => patch('projects', p.id, { text: { ...p.text, [g]: v } })} /></label>)}
            </>
          )))}
          <p><button type="button" class="btn" onClick={() => add('projects')}>{s.addProject}</button></p>
        </>
      )}
    </div>
  );
}
