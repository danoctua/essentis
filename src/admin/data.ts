/**
 * Reading and writing content from the admin. Dates are ISO strings in the UI (as in the build)
 * and Firestore Timestamps in the database. Nothing from the Google profile is ever written:
 * anything stored here can end up on the public site.
 */
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, Timestamp, writeBatch, type DocumentData,
} from 'firebase/firestore';
import { firebase } from './firebase';
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
  return snap.docs.map((d) => read<EditPost>(d.id, d.data())).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function getPost(id: string): Promise<EditPost | null> {
  const d = await getDoc(doc(db(), 'posts', id));
  return d.exists() ? read<EditPost>(d.id, d.data()) : null;
}

export async function createPost(lang: Lang): Promise<string> {
  const ref = doc(collection(db(), 'posts'));
  await setDoc(ref, { originalLang: lang, status: 'draft', topics: [], variants: { [lang]: { title: '' } }, updatedAt: Timestamp.now() });
  return ref.id;
}

export async function savePost(p: EditPost): Promise<string> {
  const { id, ...rest } = p;
  const updatedAt = new Date().toISOString();
  await setDoc(doc(db(), 'posts', id), { ...rest, publishedAt: ts(p.publishedAt), updatedAt: ts(updatedAt) });
  return updatedAt;
}

export const deletePost = (id: string) => deleteDoc(doc(db(), 'posts', id));

type Pages = { now: NowPage; about: AboutPage; uses: UsesPage };
export async function getPage<K extends keyof Pages>(id: K): Promise<Partial<Pages[K]>> {
  const d = await getDoc(doc(db(), 'pages', id));
  return d.exists() ? (iso(d.data()) as Pages[K]) : {};
}
export async function savePage<K extends keyof Pages>(id: K, data: Partial<Pages[K]>): Promise<void> {
  const out: DocumentData = { ...data };
  if (id === 'now') out.updatedAt = Timestamp.now();
  await setDoc(doc(db(), 'pages', id), out);
}

type Lists = { work: Work; projects: Project };
export async function getList<K extends keyof Lists>(name: K): Promise<Lists[K][]> {
  const snap = await getDocs(collection(db(), name));
  return snap.docs.map((d) => read<Lists[K]>(d.id, d.data())).sort((a, b) => a.order - b.order);
}
/** Writes the whole list in one batch, in the order given, and deletes entries that were removed. */
export async function saveList<K extends keyof Lists>(name: K, items: Lists[K][], removed: string[]): Promise<void> {
  const batch = writeBatch(db());
  items.forEach(({ id, ...rest }, order) => batch.set(doc(db(), name, id), { ...rest, order }));
  removed.forEach((id) => batch.delete(doc(db(), name, id)));
  await batch.commit();
}
export const newId = (name: keyof Lists) => doc(collection(db(), name)).id;

export interface PublishState { lastAt?: string; lastError?: string | null }
export const watchPublish = (cb: (s: PublishState) => void, onError: (e: Error) => void) =>
  onSnapshot(doc(db(), 'meta', 'publish'), (d) => cb((iso(d.data() ?? {}) as PublishState)), onError);
