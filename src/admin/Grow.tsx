/** A text field that grows with its text. One paragraph: Enter is not a line break. */
import { useLayoutEffect, useRef } from 'preact/hooks';

interface Props { value: string; onInput: (v: string) => void; lang?: string; class?: string; placeholder?: string; label?: string }

export function Grow({ value, onInput, lang, class: cls, placeholder, label }: Props) {
  const el = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const t = el.current; if (t?.offsetParent) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; } };
  useLayoutEffect(fit, [value]);
  useLayoutEffect(() => {
    // Hidden panes have no size: measure again when the field appears or its width changes.
    if (typeof ResizeObserver === 'undefined' || !el.current) return;
    let w = 0;
    const o = new ResizeObserver(([e]) => { if (e.contentRect.width !== w) { w = e.contentRect.width; fit(); } });
    o.observe(el.current);
    return () => o.disconnect();
  }, []);
  return (
    <textarea ref={el} rows={1} class={cls} lang={lang} spellcheck autocapitalize="sentences" placeholder={placeholder} aria-label={label} value={value}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.isComposing) e.preventDefault(); }}
      onInput={(e) => onInput(e.currentTarget.value.replace(/\s*\n\s*/g, ' '))} />
  );
}
