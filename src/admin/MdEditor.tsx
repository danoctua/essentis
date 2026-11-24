/**
 * Plain Markdown editing in CodeMirror 6. Pasted, dropped or picked images go to `onImage`, which returns the Markdown to insert.
 *
 * Uncontrolled: `value` is only the starting text, and the editor owns it from then on. Never write `value` back into the
 * editor: a late render carries older text, which would replace newer typing, report a change, and loop until the page
 * freezes. To show another document, change the `key`.
 */
import { useEffect, useRef } from 'preact/hooks';
import { minimalSetup } from 'codemirror';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { link, prefix, wrap } from './format';
import { s } from './strings';
import type { Lang } from '../data/ui';

const highlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: '500', fontSize: '1.15em' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--rust)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.9em' },
  { tag: [t.quote, t.processingInstruction, t.meta, t.comment], color: 'var(--muted)' },
]);

const theme = EditorView.theme({
  '&': { fontSize: '17px', background: 'var(--paper-raised)', color: 'var(--ink)', borderRadius: 'var(--radius-md)', boxShadow: 'inset 0 0 0 1px var(--line)' },
  '&.cm-focused': { outline: '2px solid var(--focus)', outlineOffset: '-1px' },
  '.cm-scroller': { fontFamily: 'var(--font-sans)', lineHeight: '1.6' },
  '.cm-content': { fontFamily: 'var(--font-sans)', padding: '12px 0', caretColor: 'var(--ink)' },
  '.cm-line': { padding: '0 14px', overflowWrap: 'anywhere' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'color-mix(in srgb, var(--rust) 25%, transparent)' },
});

/** The site's own sticky bars cover the top of the editor: keep the cursor clear of them when it scrolls into view. */
const margins = EditorView.scrollMargins.of(() => {
  const bar = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 56;
  return { top: bar + 46 + 12, bottom: 24 };
});

interface Props {
  /** The starting text; later changes are ignored. */
  value: string;
  onChange: (v: string) => void;
  label: string;
  lang: Lang;
  /** Upload one image and return the Markdown for it. Without it, images are refused and there are no headings or quotes. */
  onImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  minHeight?: number;
}

const ICONS = {
  quote: 'M5 6h5v6c0 3-1.5 5-4 6M14 6h5v6c0 3-1.5 5-4 6',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  link: 'M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7M14 10a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7',
  photo: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
};
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function MdEditor({ value, onChange, label, lang, onImage, onError, minHeight = 120 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const addFiles = useRef<(list: FileList | null | undefined, at: number) => boolean>(() => false);
  const props = useRef({ onChange, onImage, onError });
  props.current = { onChange, onImage, onError };

  useEffect(() => {
    let alive = true;
    const run = (f: (state: EditorState) => TransactionSpec) => (v: EditorView) => { v.dispatch(v.state.update(f(v.state))); return true; };
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          keymap.of([{ key: 'Mod-b', run: run((x) => wrap(x, '**')) }, { key: 'Mod-i', run: run((x) => wrap(x, '*')) }]),
          minimalSetup, markdown(), syntaxHighlighting(highlight), theme, margins, EditorView.lineWrapping,
          // CodeMirror switches these off; this is prose, so the keyboard should help.
          EditorView.contentAttributes.of({ 'aria-label': label, lang, spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' }),
          EditorView.theme({ '.cm-content': { minHeight: `${minHeight}px` } }),
          EditorView.updateListener.of((u) => { if (u.docChanged) props.current.onChange(u.state.doc.toString()); }),
          EditorView.domEventHandlers({
            paste: (e, x) => take(e, e.clipboardData?.files, x.state.selection.main.head),
            drop: (e, x) => take(e, e.dataTransfer?.files, x.posAtCoords({ x: e.clientX, y: e.clientY }) ?? x.state.doc.length),
          }),
        ],
      }),
    });
    const take = (e: Event, list: FileList | undefined | null, at: number) => {
      const took = addFiles.current(list, at);
      if (took) e.preventDefault();
      return took;
    };
    addFiles.current = (list, at) => {
      const images = [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!images.length) return false;
      const { onImage, onError } = props.current;
      if (!onImage) { onError?.(s.noImagesHere); return true; }
      images.forEach((file, i) => {
        const mark = `![${s.uploading} ${Date.now().toString(36)}${i}]()`;
        // An image is its own paragraph: blank lines around it, or it joins the text next to it.
        const before = v.state.doc.sliceString(Math.max(0, at - 2), at);
        const lead = at === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        v.dispatch({ changes: { from: at, insert: `${lead}${mark}\n\n` } });
        const replace = (text: string) => {
          if (!alive) return;
          const doc = v.state.doc.toString(), from = doc.indexOf(mark);
          if (from >= 0) v.dispatch({ changes: { from, to: from + mark.length + (text ? 0 : 2), insert: text } });
        };
        onImage(file).then(replace, (err: Error) => { replace(''); props.current.onError?.(`${s.uploadFailed}: ${err.message}`); });
      });
      return true;
    };
    view.current = v;
    return () => { alive = false; view.current = null; v.destroy(); };
  }, []);

  const act = (f: (state: EditorState) => TransactionSpec) => {
    const v = view.current;
    if (!v) return;
    v.dispatch(v.state.update(f(v.state)));
    v.focus();
  };
  // Pressing a button must not take the focus: on a phone that would close the keyboard.
  const stay = (e: Event) => e.preventDefault();
  const tool = (name: string, f: (state: EditorState) => TransactionSpec, inner: preact.ComponentChildren) => (
    <button type="button" aria-label={name} title={name} onMouseDown={stay} onClick={() => act(f)}>{inner}</button>
  );

  return (
    <div class="md">
      <div class="tools" role="group" aria-label={s.format}>
        {tool(s.bold, (x) => wrap(x, '**'), <b aria-hidden="true">B</b>)}
        {tool(s.italic, (x) => wrap(x, '*'), <i aria-hidden="true">I</i>)}
        {onImage && tool(s.heading, (x) => prefix(x, '## '), <span aria-hidden="true">H</span>)}
        {onImage && tool(s.quote, (x) => prefix(x, '> '), <Icon d={ICONS.quote} />)}
        {tool(s.list, (x) => prefix(x, '- '), <Icon d={ICONS.list} />)}
        {tool(s.link, link, <Icon d={ICONS.link} />)}
        {onImage && (
          <label class="tool-file" title={s.photo}>
            <Icon d={ICONS.photo} />
            <input type="file" accept="image/*" multiple aria-label={s.photo}
              onChange={(e) => { const v = view.current; if (v) addFiles.current(e.currentTarget.files, v.state.selection.main.head); e.currentTarget.value = ''; }} />
          </label>
        )}
      </div>
      <div ref={host} />
    </div>
  );
}
