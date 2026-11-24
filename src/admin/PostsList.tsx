import { useEffect, useState } from 'preact/hooks';
import { listPosts, type EditPost } from './data';
import { readDraft } from './drafts';
import { s } from './strings';
import { TopBar } from './TopBar';
import { fmtDate, ui, type Lang } from '../data/ui';

const FILTERS = ['all', 'drafts', 'live'] as const;
type Filter = (typeof FILTERS)[number];
const shows = (f: Filter, p: EditPost) => f === 'all' || (p.status === 'published') === (f === 'live');

export function PostsList() {
  const [posts, setPosts] = useState<EditPost[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [err, setErr] = useState('');
  useEffect(() => { listPosts().then(setPosts, (e) => setErr(e.message)); }, []);
  const started = readDraft<EditPost>('post:new');
  const list = posts?.filter((p) => shows(filter, p)) ?? [];
  return (
    <>
      <TopBar title={s.posts} error={err}><a class="btn primary" href="#/new" aria-label={s.newPost}>{s.newShort}</a></TopBar>
      {!posts ? !err && <p>{s.loading}</p> : (
        <>
          <div class="chips" role="group" aria-label={s.filter}>
            {FILTERS.map((f) => <button type="button" class="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{s[f]} {posts.filter((p) => shows(f, p)).length}</button>)}
          </div>
          <ul class="list">
            {started && <li><a href="#/new"><span class="ttl">{Object.values(started.data.variants).map((v) => v?.title?.trim()).find(Boolean) || s.newPost}</span><span class="meta"><b>{s.notSaved}</b></span></a></li>}
            {list.map((p) => {
              const other: Lang = p.originalLang === 'be' ? 'en' : 'be';
              const meta = [p.status === 'published' ? s.published : s.draft, ui.be.langName[p.originalLang], p.variants[other]?.body && s.translated, p.publishedAt ? fmtDate(new Date(p.publishedAt), 'be') : s.noDate];
              return (
                <li><a href={`#/post/${p.id}`}>
                  <span class="ttl" lang={p.originalLang}>{p.variants[p.originalLang]?.title?.trim() || s.untitled}</span>
                  <span class="meta">{meta.filter(Boolean).join(', ')}{readDraft(`post:${p.id}`) && <>, <b>{s.notSaved}</b></>}</span>
                </a></li>
              );
            })}
          </ul>
          {!list.length && !started && <p class="muted">{posts.length ? s.nothingHere : s.noPosts}</p>}
        </>
      )}
    </>
  );
}
