/**
 * One post: both languages, topics, date, cover and the Markdown body beside a live preview.
 * "Апублікаваць" sets the status and, the first time, the frozen slug and the date; the build's own
 * check (postProblem) runs first, so the admin never publishes what the build would reject.
 */
import { useEffect, useState } from 'preact/hooks';
import { deletePost, getPost, listPosts, savePost, type EditPost } from './data';
import { imageUrl, uploadImage } from './images';
import { MdEditor } from './MdEditor';
import { Preview } from './Preview';
import { s } from './strings';
import { afterSave, onSaveKey, unsaved, when } from './util';
import { postProblem } from '../lib/postCheck';
import { makeSlug } from '../lib/slug';
import { mediaFile } from '../lib/media';
import { MEDIA_URL } from '../lib/site';
import { postUrl } from '../lib/routes';
import { LANGS, TOPICS, topicLabels, type Lang, type Topic } from '../data/ui';
import type { Variant } from '../lib/content';

/** datetime-local works in local time; the database in UTC. */
const toLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : undefined);

/** Drops empty optional fields and a translation that has neither title nor text. */
function tidy(p: EditPost): EditPost {
  const variants: EditPost['variants'] = {};
  for (const l of LANGS) {
    const v = p.variants[l];
    if (!v) continue;
    const out: Variant = { title: v.title.trim() };
    if (v.dek?.trim()) out.dek = v.dek.trim();
    if (v.body?.trim()) out.body = v.body;
    if (l === p.originalLang || out.title || out.body) variants[l] = out;
  }
  const next = { ...p, variants };
  if (next.cover && !next.cover.alt?.trim()) next.cover = { ...next.cover, alt: '' };
  return next;
}

export function PostEditor({ id }: { id: string }) {
  const [post, setPost] = useState<EditPost | null>(null);
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState<Lang>('be');
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPost(id).then((p) => {
      if (!p) return setMsg({ text: `${s.error}: no post ${id}`, bad: true });
      setPost(p); setSaved(JSON.stringify(p)); setTab(p.originalLang);
    }, (e) => setMsg({ text: e.message, bad: true }));
  }, [id]);

  const dirty = !!post && JSON.stringify(post) !== saved;
  unsaved.current = dirty;
  useEffect(() => () => { unsaved.current = false; }, []);

  const save = async (next = post) => {
    if (!next) return;
    setBusy(true);
    try {
      const clean = tidy(next);
      // A published post is rebuilt on every deploy: never save it in a state the build rejects.
      const problem = clean.status === 'published' ? postProblem(clean as Parameters<typeof postProblem>[0]) : null;
      if (problem) {
        setMsg({ text: `${s.error}: ${problem}`, bad: true });
        return false;
      }
      const updatedAt = await savePost(clean);
      const done = { ...clean, updatedAt };
      setPost((c) => c && afterSave(c, post!, done)); setSaved(JSON.stringify(done));
      setMsg({ text: s.saved });
      return true;
    } catch (e) {
      setMsg({ text: `${s.error}: ${(e as Error).message}`, bad: true });
      return false;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => onSaveKey(() => save()), [post]);

  if (!post) return msg ? <p class={msg.bad ? 'err' : ''}>{msg.text}</p> : <p>{s.loading}</p>;

  const v = post.variants[tab] ?? { title: '' };
  const original = post.variants[post.originalLang]?.title ?? '';
  // Always from the latest post: an upload or a save may finish after more typing.
  const edit = (f: (p: EditPost) => EditPost) => setPost((p) => p && f(p));
  const setV = (patch: Partial<Variant>) =>
    edit((p) => ({ ...p, variants: { ...p.variants, [tab]: { ...(p.variants[tab] ?? { title: '' }), ...patch } } }));
  const toggleTopic = (t: Topic) =>
    edit((p) => ({ ...p, topics: p.topics.includes(t) ? p.topics.filter((x) => x !== t) : TOPICS.filter((x) => x === t || p.topics.includes(x)) }));

  const publish = async () => {
    try {
      const taken = (await listPosts()).filter((p) => p.id !== post.id && p.slug).map((p) => p.slug!);
      const next = tidy({ ...post, status: 'published', slug: post.slug || makeSlug(original, taken), publishedAt: post.publishedAt || new Date().toISOString() });
      const problem = postProblem(next as Parameters<typeof postProblem>[0]) ?? (taken.includes(next.slug!) ? `slug "${next.slug}" is taken` : null);
      if (problem) return setMsg({ text: `${s.error}: ${problem}`, bad: true });
      if (await save(next)) setMsg({ text: s.publishedNote });
    } catch (e) {
      setMsg({ text: `${s.error}: ${(e as Error).message}`, bad: true });
    }
  };
  const remove = async () => {
    if (!confirm(s.confirmDelete)) return;
    await deletePost(post.id);
    unsaved.current = false;
    location.hash = '#/';
  };
  const onImage = async (file: File) => `![](${imageUrl((await uploadImage(file, post.id)).base)})`;
  const onCover = async (file?: File) => {
    if (!file) return;
    setMsg({ text: s.uploading });
    try {
      const u = await uploadImage(file, post.id);
      edit((p) => ({ ...p, cover: { key: u.base, w: u.w, h: u.h, alt: p.cover?.alt ?? '' } }));
      setMsg(null);
    } catch (e) {
      setMsg({ text: `${s.uploadFailed}: ${(e as Error).message}`, bad: true });
    }
  };
  const fail = (text: string) => setMsg({ text, bad: true });
  const published = post.status === 'published';

  return (
    <div class="editor" data-pane={pane}>
      <div class="ed-bar">
        <a href="#/">{s.back}</a>
        <span class={`badge ${post.status}`}>{published ? s.published : s.draft}</span>
        <span class="hint" role="status">{busy ? s.saving : dirty ? s.unsaved : msg && !msg.bad ? msg.text : ''}</span>
        <span class="grow" />
        <div class="panes" role="group">
          <button type="button" class="btn" aria-pressed={pane === 'edit'} onClick={() => setPane('edit')}>{s.edit}</button>
          <button type="button" class="btn" aria-pressed={pane === 'preview'} onClick={() => setPane('preview')}>{s.preview}</button>
        </div>
        <button type="button" class="btn" onClick={() => save()} disabled={busy || !dirty}>{s.save}</button>
        {published
          ? <button type="button" class="btn" onClick={() => save({ ...post, status: 'draft' })} disabled={busy}>{s.unpublish}</button>
          : <button type="button" class="btn primary" onClick={publish} disabled={busy}>{s.publish}</button>}
      </div>
      {msg?.bad && <p class="err" role="alert">{msg.text}</p>}

      <div class="ed-main">
        <div class="fields">
          <label>{s.newPostIn}
            <select value={post.originalLang} onChange={(e) => { const originalLang = e.currentTarget.value as Lang; edit((p) => ({ ...p, originalLang })); }}>
              {LANGS.map((l) => <option value={l}>{s.langTab[l]}</option>)}
            </select>
          </label>
          <label>{s.date}
            <input type="datetime-local" value={toLocal(post.publishedAt)} onInput={(e) => { const publishedAt = fromLocal(e.currentTarget.value); edit((p) => ({ ...p, publishedAt })); }} />
            {!post.publishedAt && <span class="hint">{s.dateLater}</span>}
          </label>
          <div class="slug">
            <span class="label">{s.slug}</span>
            {post.slug
              ? <span><code>{postUrl(post.slug, 'be')}</code> <span class="hint">{s.slugFrozen}</span></span>
              : <span class="hint">{s.slugLater} <code>{postUrl(makeSlug(original, []), 'be')}</code></span>}
          </div>
        </div>

        <fieldset class="topics">
          <legend>{s.topics}</legend>
          {TOPICS.map((t) => <label class="check"><input type="checkbox" checked={post.topics.includes(t)} onChange={() => toggleTopic(t)} /> {topicLabels.be[t]}</label>)}
        </fieldset>

        <div class="cover">
          <span class="label">{s.cover}</span>
          {post.cover ? (
            <div class="cover-row">
              <img src={`${MEDIA_URL}/${mediaFile(post.cover.key, 400)}`} alt="" width={88} height={88} />
              <label class="grow">{s.alt}<input type="text" value={post.cover.alt ?? ''} onInput={(e) => { const alt = e.currentTarget.value; edit((p) => ({ ...p, cover: { ...p.cover!, alt } })); }} /></label>
              <button type="button" class="btn" onClick={() => edit((p) => ({ ...p, cover: undefined }))}>{s.removeCover}</button>
            </div>
          ) : (
            <label class="btn file">{s.addCover}<input type="file" accept="image/*" onChange={(e) => onCover(e.currentTarget.files?.[0])} /></label>
          )}
        </div>

        <div class="tabs" role="tablist">
          {LANGS.map((l) => (
            <button type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}>
              {s.langTab[l]}{l === post.originalLang ? ` (${s.original})` : ''}
            </button>
          ))}
        </div>
        {tab !== post.originalLang && <p class="hint">{s.translationHint}</p>}
        <label>{s.title}<input type="text" lang={tab} value={v.title} onInput={(e) => setV({ title: e.currentTarget.value })} /></label>
        <label>{s.dek}<input type="text" lang={tab} value={v.dek ?? ''} onInput={(e) => setV({ dek: e.currentTarget.value })} /></label>
        <div class="label-row"><span class="label">{s.body}</span><span class="hint">{s.imagesHint}</span></div>
        <MdEditor key={`${post.id}-${tab}`} value={v.body ?? ''} onChange={(body) => setV({ body })} label={`${s.body}, ${s.langTab[tab]}`} onImage={onImage} onError={fail} minHeight={420} />
        <p class="hint">{s.updated} {when(post.updatedAt)}</p>
        <p><button type="button" class="btn danger" onClick={remove}>{s.remove}</button></p>
      </div>

      <aside class="ed-preview" aria-label={s.preview}>
        <Preview md={v.body ?? ''} lang={tab} title={v.title} dek={v.dek} />
      </aside>
    </div>
  );
}
