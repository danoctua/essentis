/**
 * Reading and writing content from the admin. Dates are ISO strings in the UI (as in the build)
 * and Firestore Timestamps in the database. Nothing from the Google profile is ever written:
 * anything stored here can end up on the public site.
 */
import {
  collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, Timestamp, writeBatch, type DocumentData, type WriteBatch,
} from 'firebase/firestore';
import { firebase } from './firebase';
import { byDate } from './util';
import type { Lang } from '../data/ui';
import type { AboutPage, NowPage, Post, Project, UsesPage, Work } from '../lib/content';

/** A post as the editor holds it: drafts have no slug and maybe no date yet. */
export type EditPost = Omit<Post, 'slug' | 'publishedAt'> & { slug?: string; publishedAt?: string };

const db = () => firebase().db;
const iso = (v: unknown): unknown => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(iso);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, iso(x)]));
  return v;
};
const ts = (s?: string) => (s ? Timestamp.fromDate(new Date(s)) : undefined);
const read = <T>(id: string, data: DocumentData) => ({ ...(iso(data) as object), id }) as T;

export async function listPosts(): Promise<EditPost[]> {
  const snap = await getDocs(collection(db(), 'posts'));
  return snap.docs.map((d) => read<EditPost>(d.id, d.data())).sort(byDate);
}

export async function getPost(id: string): Promise<EditPost | null> {
  const d = await getDoc(doc(db(), 'posts', id));
  return d.exists() ? read<EditPost>(d.id, d.data()) : null;
}

/** Remembers that the site no longer shows what is saved; "update site" is then offered. */
const markChanged = (batch: WriteBatch) => batch.set(doc(db(), 'meta', 'changes'), { at: serverTimestamp() });

/** An id for a post that does not exist yet. Nothing is written until the first save. */
export const newPostId = () => doc(collection(db(), 'posts')).id;
export const blankPost = (id: string, lang: Lang): EditPost =>
  ({ id, originalLang: lang, status: 'draft', topics: [], variants: { [lang]: { title: '' } }, updatedAt: '' });

/** `live`: the post is on the site now, or was before this save. */
export async function savePost(p: EditPost, live: boolean): Promise<string> {
  const { id, ...rest } = p;
  const updatedAt = new Date().toISOString();
  const batch = writeBatch(db());
  batch.set(doc(db(), 'posts', id), { ...rest, publishedAt: ts(p.publishedAt), updatedAt: ts(updatedAt) });
  if (live) markChanged(batch);
  await batch.commit();
  return updatedAt;
}

export async function deletePost(id: string, live: boolean): Promise<void> {
  const batch = writeBatch(db());
  batch.delete(doc(db(), 'posts', id));
  if (live) markChanged(batch);
  await batch.commit();
}

type Pages = { now: NowPage; about: AboutPage; uses: UsesPage };
export async function getPage<K extends keyof Pages>(id: K): Promise<Partial<Pages[K]>> {
  const d = await getDoc(doc(db(), 'pages', id));
  return d.exists() ? (iso(d.data()) as Pages[K]) : {};
}
/** Writes one or more pages at once. */
export async function savePages(pages: { [K in keyof Pages]?: Partial<Pages[K]> }): Promise<void> {
  const batch = writeBatch(db());
  for (const [id, data] of Object.entries(pages)) {
    batch.set(doc(db(), 'pages', id), id === 'now' ? { ...data, updatedAt: Timestamp.now() } : data);
  }
  markChanged(batch);
  await batch.commit();
}

type Lists = { work: Work; projects: Project };
export async function getList<K extends keyof Lists>(name: K): Promise<Lists[K][]> {
  const snap = await getDocs(collection(db(), name));
  return snap.docs.map((d) => read<Lists[K]>(d.id, d.data())).sort((a, b) => a.order - b.order);
}
/** Writes both lists in one batch, in the order given, and deletes the entries in `gone`. */
export async function saveLists(lists: { [K in keyof Lists]: Lists[K][] }, gone: string[]): Promise<void> {
  const batch = writeBatch(db());
  for (const name of ['work', 'projects'] as const) {
    const keep = lists[name].filter((x) => !gone.includes(x.id));
    keep.forEach(({ id, ...rest }, order) => batch.set(doc(db(), name, id), { ...rest, order }));
    lists[name].filter((x) => gone.includes(x.id)).forEach((x) => batch.delete(doc(db(), name, x.id)));
  }
  markChanged(batch);
  await batch.commit();
}
export const newId = (name: keyof Lists) => doc(collection(db(), name)).id;

export interface PublishState { lastAt?: string; lastError?: string | null; changedAt?: string }
/** Saved after the last rebuild started, so not on the site yet. */
export const isPending = (p: PublishState) => !!p.changedAt && (!p.lastAt || p.changedAt > p.lastAt);

export function watchPublish(cb: (s: PublishState) => void, onError: (e: Error) => void): () => void {
  let state: PublishState = {};
  const put = (s: PublishState) => cb(state = { ...state, ...s });
  const offs = [
    onSnapshot(doc(db(), 'meta', 'publish'), (d) => put(iso(d.data() ?? {}) as PublishState), onError),
    onSnapshot(doc(db(), 'meta', 'changes'), (d) => put({ changedAt: (iso(d.data({ serverTimestamps: 'estimate' }) ?? {}) as { at?: string }).at }), onError),
  ];
  return () => offs.forEach((off) => off());
}
