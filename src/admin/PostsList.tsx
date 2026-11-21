import { useEffect, useState } from 'preact/hooks';
import { createPost, listPosts, type EditPost } from './data';
import { s } from './strings';
import { when } from './util';
import { LANGS, type Lang } from '../data/ui';

export function PostsList() {
  const [posts, setPosts] = useState<EditPost[] | null>(null);
  const [lang, setLang] = useState<Lang>('be');
  const [err, setErr] = useState('');
  useEffect(() => { listPosts().then(setPosts, (e) => setErr(e.message)); }, []);
  const create = async () => {
    try { location.hash = `#/post/${await createPost(lang)}`; } catch (e) { setErr((e as Error).message); }
  };
  return (
    <>
      <div class="head">
        <h1 class="page-title">{s.posts}</h1>
        <div class="row">
          <label class="inline">{s.newPostIn}
            <select value={lang} onChange={(e) => setLang(e.currentTarget.value as Lang)}>
              {LANGS.map((l) => <option value={l}>{s.langTab[l]}</option>)}
            </select>
          </label>
          <button type="button" class="btn primary" onClick={create}>{s.newPost}</button>
        </div>
      </div>
      {err && <p class="err" role="alert">{err}</p>}
      {posts === null ? <p>{s.loading}</p> : posts.length === 0 ? <p class="muted">{s.noPosts}</p> : (
        <ul class="list">
          {posts.map((p) => {
            const title = p.variants[p.originalLang]?.title?.trim();
            const other: Lang = p.originalLang === 'be' ? 'en' : 'be';
            const v = p.variants[other];
            return (
              <li><a href={`#/post/${p.id}`}>
                <span class="ttl" lang={p.originalLang}>{title || s.untitled}</span>
                <span class="meta">
                  <span class={`badge ${p.status}`}>{p.status === 'published' ? s.published : s.draft}</span>
                  {' '}{p.originalLang.toUpperCase()}{v?.body ? ` + ${other.toUpperCase()}` : v?.title ? ` (${other.toUpperCase()}: ${s.title.toLowerCase()})` : ''}
                  {' · '}{s.updated} {when(p.updatedAt)}
                </span>
              </a></li>
            );
          })}
        </ul>
      )}
    </>
  );
}
