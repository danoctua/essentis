/**
 * One post in three parts: Text (both languages), Settings (topics, date, cover, publishing) and Preview, which sits
 * beside the other two on a wide screen. A new post is written to the database on its first save, not before.
 * "Апублікаваць" sets the status and, the first time, the frozen slug and the date; the build's own
 * check (postProblem) runs first, so the admin never publishes what the build would reject.
 */
import { useEffect, useState } from 'preact/hooks';
import { blankPost, deletePost, getPost, listPosts, savePost, type EditPost } from './data';
import { clearDraft, readDraft, useKeep } from './drafts';
import { Grow } from './Grow';
import { imageUrl, uploadImage } from './images';
import { MdEditor } from './MdEditor';
import { Preview } from './Preview';
import { s } from './strings';
import { Restored, SaveState, TopBar } from './TopBar';
import { afterSave, onSaveKey, replaceHash, when } from './util';
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

const PANES = ['text', 'settings', 'preview'] as const;
type Pane = (typeof PANES)[number];
const paneName = { text: s.paneText, settings: s.paneSettings, preview: s.preview };

const WIDE = '(min-width: 1100px)';
function useWide(): boolean {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => {
    const m = matchMedia(WIDE), on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

export function PostEditor({ id, isNew }: { id: string; isNew: boolean }) {
  const [post, setPost] = useState<EditPost | null>(null);
  const [saved, setSaved] = useState('');
  const [exists, setExists] = useState(!isNew);
  const [tab, setTab] = useState<Lang>('be');
  const [pane, setPane] = useState<Pane>('text');
  const [rev, setRev] = useState(0);
  const [restored, setRestored] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const wide = useWide();

  useEffect(() => {
    const start = (p: EditPost, key: string) => {
      const k = readDraft<EditPost>(key);
      // What is on the site is the database's word, not the copy's.
      const x: EditPost = k ? { ...p, ...k.data, id: p.id, status: p.status, slug: p.slug, updatedAt: p.updatedAt } : p;
      setSaved(JSON.stringify(p)); setPost(x); setTab(x.originalLang); setRestored(k?.at ?? '');
    };
    if (isNew) start(blankPost(id, 'be'), 'post:new');
    else getPost(id).then((p) => (p ? start(p, `post:${id}`) : setErr(`${s.error}: no post ${id}`)), (e) => setErr(e.message));
  }, [id]);

  const dirty = !!post && JSON.stringify(post) !== saved;
  const key = exists ? `post:${id}` : 'post:new';
  const { kept, forget } = useKeep(post && key, post, dirty);
  const onSite = !!saved && (JSON.parse(saved) as EditPost).status === 'published';

  const save = async (next = post) => {
    if (!next || busy) return false;
    setBusy(true); setErr(''); setNote('');
    try {
      const clean = tidy(next);
      // A published post is rebuilt on every deploy: never save it in a state the build rejects.
      const problem = clean.status === 'published' ? postProblem(clean as Parameters<typeof postProblem>[0]) : null;
      if (problem) { setErr(`${s.error}: ${problem}`); return false; }
      const updatedAt = await savePost(clean, onSite || clean.status === 'published');
      const after = { ...clean, updatedAt };
      setPost((c) => c && afterSave(c, post!, after)); setSaved(JSON.stringify(after)); setRestored(''); setDone(true);
      if (!exists) { setExists(true); clearDraft('post:new'); replaceHash(`#/post/${id}`); }
      return true;
    } catch (e) {
      setErr(`${s.error}: ${(e as Error).message}`);
      return false;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => onSaveKey(() => save()), [post, busy, exists]);

  if (!post) return <TopBar title={s.posts} back="#/" error={err} status={err ? '' : s.loading} />;

  const v = post.variants[tab] ?? { title: '' };
  const original = post.variants[post.originalLang]?.title ?? '';
  // Always from the latest post: an upload or a save may finish after more typing.
  const edit = (f: (p: EditPost) => EditPost) => setPost((p) => p && f(p));
  const setV = (patch: Partial<Variant>) =>
    edit((p) => ({ ...p, variants: { ...p.variants, [tab]: { ...(p.variants[tab] ?? { title: '' }), ...patch } } }));
  const toggleTopic = (t: Topic) =>
    edit((p) => ({ ...p, topics: p.topics.includes(t) ? p.topics.filter((x) => x !== t) : TOPICS.filter((x) => x === t || p.topics.includes(x)) }));
  const pickLang = (l: Lang) => {
    setTab(l);
    // Nothing written yet: the language you start in is the original.
    const o = post.variants[post.originalLang];
    if (!exists && !o?.title.trim() && !o?.body?.trim()) edit((p) => ({ ...p, originalLang: l, variants: { [l]: p.variants[l] ?? { title: '' } } }));
  };

  const publish = async () => {
    try {
      if (!original.trim()) return setErr(s.needTitle);
      const taken = (await listPosts()).filter((p) => p.id !== post.id && p.slug).map((p) => p.slug!);
      const next = tidy({ ...post, status: 'published', slug: post.slug || makeSlug(original, taken), publishedAt: post.publishedAt || new Date().toISOString() });
      const problem = postProblem(next as Parameters<typeof postProblem>[0]) ?? (taken.includes(next.slug!) ? `slug "${next.slug}" is taken` : null);
      if (problem) return setErr(`${s.error}: ${problem}`);
      if (!post.slug && !confirm(s.confirmPublish(postUrl(next.slug!, 'be')))) return;
      if (await save(next)) setNote(s.publishedNote);
    } catch (e) {
      setErr(`${s.error}: ${(e as Error).message}`);
    }
  };
  const unpublish = () => { if (confirm(s.confirmUnpublish)) save({ ...post, status: 'draft' }); };
  const remove = async () => {
    if (!confirm(s.confirmDelete)) return;
    try {
      if (exists) await deletePost(post.id, onSite);
      forget();
      location.hash = '#/';
    } catch (e) { setErr(`${s.error}: ${(e as Error).message}`); }
  };
  const onImage = async (file: File) => `![](${imageUrl((await uploadImage(file, post.id)).base)})`;
  const onCover = async (file?: File) => {
    if (!file) return;
    setNote(s.uploading); setErr('');
    try {
      const u = await uploadImage(file, post.id);
      edit((p) => ({ ...p, cover: { key: u.base, w: u.w, h: u.h, alt: p.cover?.alt ?? '' } }));
    } catch (e) {
      setErr(`${s.uploadFailed}: ${(e as Error).message}`);
    }
    setNote('');
  };
  const published = post.status === 'published';
  const shown = wide && pane === 'preview' ? 'text' : pane;

  return (
    <div class="editor" data-pane={shown}>
      <TopBar title={original || s.newPost} back="#/" error={err}
        status={<><span class={`badge ${post.status}`}>{published ? s.published : s.draft}</span> <span class="state"><SaveState dirty={dirty} busy={busy} kept={kept} saved={done} /></span></>}
        notice={note || (restored && dirty && <Restored at={restored} onDiscard={() => { const p = JSON.parse(saved) as EditPost; setPost(p); setTab(p.originalLang); setRev(rev + 1); setRestored(''); }} />)}>
        <button type="button" class="btn primary" onClick={() => save()} disabled={busy || !dirty}>{s.save}</button>
      </TopBar>

      <div class="tabs panes" role="group" aria-label={s.panes}>
        {PANES.filter((x) => !wide || x !== 'preview').map((x) => <button type="button" aria-pressed={shown === x} onClick={() => { setPane(x); if (!wide) scrollTo(0, 0); }}>{paneName[x]}</button>)}
      </div>

      <div class="ed-main">
        <div class="pane-text">
          <div class="tabs langs-tabs" role="group">
            {LANGS.map((l) => <button type="button" aria-pressed={tab === l} onClick={() => pickLang(l)}>{s.langTab[l]}{l === post.originalLang ? ` (${s.original})` : ''}</button>)}
          </div>
          {tab !== post.originalLang && <p class="hint">{s.translationHint}</p>}
          <Grow key={`t-${tab}`} class="big-title" lang={tab} label={s.title} placeholder={s.title} value={v.title} onInput={(title) => setV({ title })} />
          <Grow key={`d-${tab}`} class="big-dek" lang={tab} label={s.dek} placeholder={s.dek} value={v.dek ?? ''} onInput={(dek) => setV({ dek })} />
          <MdEditor key={`${post.id}-${tab}-${rev}`} value={v.body ?? ''} lang={tab} onChange={(x) => setV({ body: x })} label={`${s.body}, ${s.langTab[tab]}`} onImage={onImage} onError={setErr} minHeight={320} />
        </div>

        <div class="pane-settings">
          <fieldset>
            <legend>{s.topics}</legend>
            <div class="chips">{TOPICS.map((t) => <button type="button" class="chip" aria-pressed={post.topics.includes(t)} onClick={() => toggleTopic(t)}>{topicLabels.be[t]}</button>)}</div>
          </fieldset>
          <label>{s.date}
            <input type="datetime-local" value={toLocal(post.publishedAt)} onInput={(e) => { const publishedAt = fromLocal(e.currentTarget.value); edit((p) => ({ ...p, publishedAt })); }} />
            <span class="hint">{post.publishedAt ? when(post.publishedAt) : s.dateLater}</span>
          </label>
          <div class="cover">
            <span class="label">{s.cover}</span>
            {post.cover ? (
              <>
                <div class="actions"><img src={`${MEDIA_URL}/${mediaFile(post.cover.key, 400)}`} alt="" width={88} height={88} />
                  <button type="button" class="btn" onClick={() => edit((p) => ({ ...p, cover: undefined }))}>{s.removeCover}</button></div>
                <label>{s.alt}<Grow lang={post.originalLang} value={post.cover.alt ?? ''} onInput={(alt) => edit((p) => ({ ...p, cover: { ...p.cover!, alt } }))} /></label>
              </>
            ) : (
              <label class="btn file">{s.addCover}<input type="file" accept="image/*" onChange={(e) => onCover(e.currentTarget.files?.[0])} /></label>
            )}
          </div>
          <label>{s.newPostIn}
            <select value={post.originalLang} onChange={(e) => { const originalLang = e.currentTarget.value as Lang; edit((p) => ({ ...p, originalLang })); }}>
              {LANGS.map((l) => <option value={l}>{s.langTab[l]}</option>)}
            </select>
          </label>
          <div class="publication">
            <span class="label">{s.publication}</span>
            <p class="hint">{post.slug ? s.slugFrozen : s.slugLater}</p>
            <p><code>{postUrl(post.slug || makeSlug(original, []), 'be')}</code></p>
            <div class="actions">
              {published
                ? <button type="button" class="btn" onClick={unpublish} disabled={busy}>{s.unpublish}</button>
                : <button type="button" class="btn primary" onClick={publish} disabled={busy}>{s.publish}</button>}
            </div>
          </div>
          <div class="danger-zone">
            {exists && <p class="hint">{s.updated} {when(post.updatedAt)}</p>}
            <button type="button" class="btn danger" onClick={remove}>{s.remove}</button>
          </div>
        </div>
      </div>

      <aside class="ed-preview" aria-label={s.preview}>
        {(wide || pane === 'preview') && <Preview md={v.body ?? ''} lang={tab} title={v.title} dek={v.dek} />}
      </aside>
    </div>
  );
}
