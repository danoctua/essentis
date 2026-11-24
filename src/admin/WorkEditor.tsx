/** Work history and projects for About › Work. Order is the list order; saved in one batch. */
import { useEffect, useState } from 'preact/hooks';
import { getList, newId, saveList } from './data';
import { s } from './strings';
import { onSaveKey, unsaved } from './util';
import { LANGS } from '../data/ui';
import type { Project, Work } from '../lib/content';

type Lists = { work: Work[]; projects: Project[]; removed: { work: string[]; projects: string[] } };

const move = <T,>(xs: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= xs.length) return xs;
  const out = [...xs];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};
const year = (v: string) => (v.trim() ? Number.parseInt(v, 10) || 0 : null);

export function WorkEditor() {
  const [l, setL] = useState<Lists | null>(null);
  const [saved, setSaved] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([getList('work'), getList('projects')]).then(([work, projects]) => {
      const x = { work, projects, removed: { work: [], projects: [] } };
      setL(x); setSaved(JSON.stringify(x));
    }, (e) => setMsg({ text: e.message, bad: true }));
  }, []);
  const dirty = !!l && JSON.stringify(l) !== saved;
  unsaved.current = dirty;
  useEffect(() => () => { unsaved.current = false; }, []);

  const save = async () => {
    if (!l) return;
    try {
      await Promise.all([saveList('work', l.work, l.removed.work), saveList('projects', l.projects, l.removed.projects)]);
      const x = { ...l, removed: { work: [], projects: [] } };
      setL(x); setSaved(JSON.stringify(x)); setMsg({ text: s.saved });
    } catch (e) { setMsg({ text: `${s.error}: ${(e as Error).message}`, bad: true }); }
  };
  useEffect(() => onSaveKey(save), [l]);
  if (!l) return <p class={msg?.bad ? 'err' : ''}>{msg?.text ?? s.loading}</p>;

  const setWork = (i: number, patch: Partial<Work>) => setL({ ...l, work: l.work.map((w, k) => (k === i ? { ...w, ...patch } : w)) });
  const setProj = (i: number, patch: Partial<Project>) => setL({ ...l, projects: l.projects.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const tools = (kind: 'work' | 'projects', i: number, id: string) => (
    <div class="row">
      <button type="button" class="btn" onClick={() => setL({ ...l, [kind]: move(l[kind] as unknown[], i, -1) })} disabled={i === 0}>{s.up}</button>
      <button type="button" class="btn" onClick={() => setL({ ...l, [kind]: move(l[kind] as unknown[], i, 1) })} disabled={i === l[kind].length - 1}>{s.down}</button>
      <button type="button" class="btn danger" onClick={() => setL({ ...l, [kind]: (l[kind] as { id: string }[]).filter((x) => x.id !== id), removed: { ...l.removed, [kind]: [...l.removed[kind], id] } })}>{s.remove}</button>
    </div>
  );

  return (
    <div class="form-page">
      <div class="ed-bar">
        <h1 class="page-title">{s.work}</h1>
        <span class="hint" role="status">{dirty ? s.unsaved : msg && !msg.bad ? msg.text : ''}</span>
        <span class="grow" />
        <button type="button" class="btn primary" onClick={save} disabled={!dirty}>{s.save}</button>
      </div>
      {msg?.bad && <p class="err" role="alert">{msg.text}</p>}

      <h2 class="h2">{s.workList}</h2>
      {l.work.map((w, i) => (
        <fieldset class="card">
          <legend>{w.role || s.role}, {w.company || s.company}</legend>
          <div class="grid2">
            <label>{s.from}<input type="number" inputMode="numeric" value={w.from || ''} onInput={(e) => setWork(i, { from: year(e.currentTarget.value) ?? 0 })} /></label>
            <label>{s.to}<input type="number" inputMode="numeric" value={w.to ?? ''} onInput={(e) => setWork(i, { to: year(e.currentTarget.value) })} /></label>
            <label>{s.role}<input type="text" value={w.role} onInput={(e) => setWork(i, { role: e.currentTarget.value })} /></label>
            <label>{s.company}<input type="text" value={w.company} onInput={(e) => setWork(i, { company: e.currentTarget.value })} /></label>
          </div>
          {LANGS.map((g) => <label>{s.line} ({s.langTab[g].toLowerCase()})<input type="text" lang={g} value={w.line[g] ?? ''} onInput={(e) => setWork(i, { line: { ...w.line, [g]: e.currentTarget.value } })} /></label>)}
          {tools('work', i, w.id)}
        </fieldset>
      ))}
      <p><button type="button" class="btn" onClick={() => setL({ ...l, work: [...l.work, { id: newId('work'), from: new Date().getFullYear(), to: null, role: '', company: '', line: {}, order: l.work.length }] })}>{s.add}</button></p>

      <h2 class="h2">{s.projects}</h2>
      <p class="hint">{s.linksHint}</p>
      {l.projects.map((p, i) => (
        <fieldset class="card">
          <legend>{p.name || s.name}</legend>
          <div class="grid2">
            <label>{s.name}<input type="text" value={p.name} onInput={(e) => setProj(i, { name: e.currentTarget.value })} /></label>
            <label>{s.url}<input type="url" value={p.url ?? ''} onInput={(e) => setProj(i, { url: e.currentTarget.value || undefined })} /></label>
          </div>
          {LANGS.map((g) => <label>{s.text} ({s.langTab[g].toLowerCase()})<input type="text" lang={g} value={p.text[g] ?? ''} onInput={(e) => setProj(i, { text: { ...p.text, [g]: e.currentTarget.value } })} /></label>)}
          {tools('projects', i, p.id)}
        </fieldset>
      ))}
      <p><button type="button" class="btn" onClick={() => setL({ ...l, projects: [...l.projects, { id: newId('projects'), name: '', text: {}, order: l.projects.length }] })}>{s.add}</button></p>
    </div>
  );
}
