import { describe, expect, it } from 'vitest';
import { inlineLinks } from '../src/lib/inline';

describe('inlineLinks', () => {
  it('turns Markdown links into anchors', () => {
    expect(inlineLinks('See [the post](https://t.me/builders/302) and [repo](https://github.com/x/y).'))
      .toBe('See <a href="https://t.me/builders/302">the post</a> and <a href="https://github.com/x/y">repo</a>.');
  });
  it('escapes everything else', () => {
    expect(inlineLinks('<b>A & B</b> [x](javascript:alert(1))')).toBe('&lt;b&gt;A &amp; B&lt;/b&gt; [x](javascript:alert(1))');
    expect(inlineLinks('[a"b](https://e.x/"q)')).toBe('<a href="https://e.x/&quot;q">a&quot;b</a>');
  });
  it('leaves plain text alone', () => expect(inlineLinks('25K+ members, 600+ chats')).toBe('25K+ members, 600+ chats'));
});
