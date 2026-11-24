/**
 * Plain Markdown editing in CodeMirror 6. Pasted or dropped images go to `onImage`, which returns the Markdown to insert.
 *
 * Uncontrolled: `value` is only the starting text, and the editor owns it from then on. Never write `value` back into the
 * editor: a late render carries older text, which would replace newer typing, report a change, and loop until the page
 * freezes. To show another document, change the `key`.
 */
import { useEffect, useRef } from 'preact/hooks';
import { minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { s } from './strings';

const highlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: '600' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--rust)' },
  { tag: [t.monospace, t.quote, t.processingInstruction, t.meta, t.comment], color: 'var(--muted)' },
]);

const theme = EditorView.theme({
  '&': { fontSize: '15px', background: 'var(--paper-raised)', color: 'var(--ink)', borderRadius: 'var(--radius-md)', boxShadow: 'inset 0 0 0 1px var(--line)' },
  '&.cm-focused': { outline: '2px solid var(--focus)', outlineOffset: '2px' },
  '.cm-content': { fontFamily: 'var(--font-mono)', lineHeight: '1.65', padding: '12px 0', caretColor: 'var(--ink)' },
  '.cm-line': { padding: '0 14px' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'color-mix(in srgb, var(--rust) 25%, transparent)' },
});

interface Props {
  /** The starting text; later changes are ignored. */
  value: string;
  onChange: (v: string) => void;
  label: string;
  /** Upload one image and return the Markdown for it. Without it, images are refused. */
  onImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  minHeight?: number;
}

export function MdEditor({ value, onChange, label, onImage, onError, minHeight = 120 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef({ onChange, onImage, onError });
  props.current = { onChange, onImage, onError };

  useEffect(() => {
    const files = (list: FileList | undefined | null, v: EditorView, at: number, e: Event) => {
      const images = [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!images.length) return false;
      e.preventDefault();
      const { onImage, onError } = props.current;
      if (!onImage) { onError?.(s.noImagesHere); return true; }
      images.forEach((file, i) => {
        const mark = `![${s.uploading} ${Date.now().toString(36)}${i}]()`;
        // An image is its own paragraph: blank lines around it, or it joins the text next to it.
        const before = v.state.doc.sliceString(Math.max(0, at - 2), at);
        const lead = at === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        v.dispatch({ changes: { from: at, insert: `${lead}${mark}\n\n` } });
        const replace = (text: string) => {
          const doc = v.state.doc.toString(), from = doc.indexOf(mark);
          if (from >= 0) v.dispatch({ changes: { from, to: from + mark.length + (text ? 0 : 2), insert: text } });
        };
        onImage(file).then(replace, (err: Error) => { replace(''); onError?.(`${s.uploadFailed}: ${err.message}`); });
      });
      return true;
    };
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          minimalSetup, markdown(), syntaxHighlighting(highlight), theme, EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.theme({ '.cm-content': { minHeight: `${minHeight}px` } }),
          EditorView.updateListener.of((u) => { if (u.docChanged) props.current.onChange(u.state.doc.toString()); }),
          EditorView.domEventHandlers({
            paste: (e, v) => files(e.clipboardData?.files, v, v.state.selection.main.head, e),
            drop: (e, v) => files(e.dataTransfer?.files, v, v.posAtCoords({ x: e.clientX, y: e.clientY }) ?? v.state.doc.length, e),
          }),
        ],
      }),
    });
    return () => v.destroy();
  }, []);

  return <div class="md" ref={host} />;
}
