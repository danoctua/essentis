/** Formatting commands for the Markdown editor. Each one is a toggle and keeps the selection on the same text. */
import { EditorSelection, type ChangeSpec, type EditorState, type TransactionSpec } from '@codemirror/state';

/** Wraps the selection in `m` (`**`, `*`), or unwraps it. */
export function wrap(state: EditorState, m: string): TransactionSpec {
  const n = m.length;
  return {
    ...state.changeByRange((r) => {
      const text = state.sliceDoc(r.from, r.to);
      const around = (a: number, b: number) => state.sliceDoc(Math.max(0, a), b);
      // `*` inside `**` is bold, not italic.
      const lone = (a: number, b: number) => n > 1 || (around(a - 1, a) !== m && around(b, b + 1) !== m);
      if (around(r.from - n, r.from) === m && around(r.to, r.to + n) === m && lone(r.from - n, r.to + n)) {
        return { changes: [{ from: r.from - n, to: r.from }, { from: r.to, to: r.to + n }], range: EditorSelection.range(r.from - n, r.to - n) };
      }
      if (text.length > 2 * n && text.startsWith(m) && text.endsWith(m) && (n > 1 || (text[1] !== m && text.at(-2) !== m))) {
        return { changes: { from: r.from, to: r.to, insert: text.slice(n, -n) }, range: EditorSelection.range(r.from, r.to - 2 * n) };
      }
      return { changes: [{ from: r.from, insert: m }, { from: r.to, insert: m }], range: EditorSelection.range(r.from + n, r.to + n) };
    }),
    scrollIntoView: true, userEvent: 'input.format',
  };
}

/** Puts `p` (`## `, `> `, `- `) at the start of every selected line, or removes it from all of them. */
export function prefix(state: EditorState, p: string): TransactionSpec {
  const r = state.selection.main, changes: ChangeSpec[] = [];
  const first = state.doc.lineAt(r.from).number, last = state.doc.lineAt(r.to).number;
  const lines = Array.from({ length: last - first + 1 }, (_, i) => state.doc.line(first + i)).filter((l) => l.text.trim() || first === last);
  const all = lines.every((l) => l.text.startsWith(p));
  // Another block mark gives way: "> a" becomes "- a", not "- > a".
  const other = /^(?:#{1,6} |> |[-*] |\d+\. )/;
  for (const l of lines) {
    if (all) changes.push({ from: l.from, to: l.from + p.length });
    else if (!l.text.startsWith(p)) changes.push({ from: l.from, to: l.from + (other.exec(l.text)?.[0].length ?? 0), insert: p });
  }
  const set = state.changes(changes);
  return { changes: set, selection: state.selection.map(set, 1), scrollIntoView: true, userEvent: 'input.format' };
}

/** `[text](https://)`, with the cursor where typing is needed next. */
export function link(state: EditorState): TransactionSpec {
  const r = state.selection.main, text = state.sliceDoc(r.from, r.to), url = 'https://';
  const isUrl = /^https?:\/\/\S+$/.test(text);
  const insert = isUrl ? `[](${text})` : `[${text}](${url})`;
  const at = r.from + 1;
  const selection = isUrl || !text ? EditorSelection.cursor(at) : EditorSelection.range(at + text.length + 2, at + text.length + 2 + url.length);
  return { changes: { from: r.from, to: r.to, insert }, selection, scrollIntoView: true, userEvent: 'input.format' };
}
