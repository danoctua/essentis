"""Telegram text with formatting entities to the site's Markdown. Pure."""
import re
from dataclasses import dataclass
from itertools import groupby

from telethon.helpers import add_surrogate, del_surrogate
from telethon.tl import types as tl

ESCAPE = re.compile(r"([\\`*_\[\]<>~|])")
ITEM = re.compile(r"^(?:[—–•-]\s+)(?=\S)")
NUMBER = re.compile(r"^\d{1,2}\.\s")
RULE = re.compile(r"^[—–-]+$")
# A short line that is all bold and stands alone.
HEADING = re.compile(r"^\*\*([^*]{1,80}[^*.!?:…])\*\*$")
EDGE = ".,:;!?)(…"
# Outermost first. Links are never split; a spoiler or underline becomes plain text.
STYLES = ("link", "bold", "italic", "strike", "code")
KINDS = {tl.MessageEntityBold: "bold", tl.MessageEntityItalic: "italic", tl.MessageEntityStrike: "strike", tl.MessageEntityCode: "code"}
MARK = {"bold": "**", "italic": "*", "strike": "~~"}


@dataclass
class Char:
    ch: str
    style: dict
    block: str = ""  # "", "quote" or "pre"


def chars(text: str, entities) -> list[Char]:
    """One entry per character, each with its styles. Custom emoji are dropped: outside Telegram only a stand-in is left."""
    sur = add_surrogate(text)  # entity offsets count UTF-16 units
    out = [Char(c, {}) for c in sur]
    for e in entities or []:
        span = out[e.offset:e.offset + e.length]
        raw = del_surrogate(sur[e.offset:e.offset + e.length])
        if kind := KINDS.get(type(e)):
            for c in span:
                c.style[kind] = True
        elif isinstance(e, tl.MessageEntityTextUrl):
            for c in span:
                c.style["link"] = e.url
        elif isinstance(e, tl.MessageEntityUrl):
            for c in span:
                c.style["link"] = raw if re.match(r"[a-z]+://", raw, re.I) else f"https://{raw}"
        elif isinstance(e, tl.MessageEntityMention):
            for c in span:
                c.style["link"] = f"https://t.me/{raw.lstrip('@')}"
        elif isinstance(e, (tl.MessageEntityBlockquote, tl.MessageEntityPre)):
            for c in span:
                c.block = "quote" if isinstance(e, tl.MessageEntityBlockquote) else "pre"
        elif isinstance(e, tl.MessageEntityCustomEmoji):
            for c in span:
                c.ch = ""
    # Put surrogate pairs back together.
    whole, i, gap = [], 0, False
    while i < len(out):
        c = out[i]
        if not c.ch:
            gap = True
        elif gap:
            # "Amazon 📱:" must not become "Amazon :".
            while c.ch in ",.:;!?)" and whole and whole[-1].ch == " ":
                whole.pop()
            gap = False
        if c.ch and "\ud800" <= c.ch <= "\udbff" and i + 1 < len(out):
            c.ch, i = del_surrogate(c.ch + out[i + 1].ch), i + 1
        if c.ch and c.ch != "​":
            whole.append(c)
        i += 1
    return whole


def lines(cs: list[Char]) -> list[list[Char]]:
    out: list[list[Char]] = [[]]
    for c in cs:
        out.append([]) if c.ch == "\n" else out[-1].append(c)
    return [tidy(l) for l in out]


def tidy(l: list[Char]) -> list[Char]:
    """Trims, and closes the gaps dropped emoji leave."""
    if any(c.block == "pre" for c in l):
        return l
    kept: list[Char] = []
    for c in l:
        if c.ch.isspace() and (not kept or kept[-1].ch.isspace()):
            continue
        kept.append(c)
    while kept and kept[-1].ch.isspace():
        kept.pop()
    return kept


def plain(l: list[Char]) -> str:
    return "".join(c.ch for c in l)


def inline(cs: list[Char], styles=STYLES, before: str = "", after: str = "") -> str:
    if not styles:
        return ESCAPE.sub(r"\\\1", plain(cs))
    style, rest = styles[0], styles[1:]
    runs = [(k, list(g)) for k, g in groupby(cs, key=lambda c: c.style.get(style))]
    out = ""
    for i, (value, run) in enumerate(runs):
        prev = runs[i - 1][1][-1].ch if i else before
        nxt = runs[i + 1][1][0].ch if i + 1 < len(runs) else after
        if not value:
            out += inline(run, rest, prev, nxt)
            continue
        # Markers must hug the text, and cannot sit between a letter and punctuation.
        a, b = 0, len(run)
        while a < b and (run[a].ch.isspace() or (style in MARK and run[a].ch in EDGE and (prev if a == 0 else run[a - 1].ch).isalnum())):
            a += 1
        while b > a and (run[b - 1].ch.isspace() or (style in MARK and run[b - 1].ch in EDGE and (nxt if b == len(run) else run[b].ch).isalnum())):
            b -= 1
        core = run[a:b]
        out += inline(run[:a], rest)
        if core:
            if style == "code":
                out += f"`{plain(core).replace('`', '')}`"
            elif style == "link":
                text, url = inline(core, rest), re.sub(r"[()<>\s]", lambda m: f"%{ord(m[0]):02X}", value)
                out += f"<{value}>" if plain(core) == value and "\\" not in value else f"[{text}]({url})"
            else:
                out += f"{MARK[style]}{inline(core, rest)}{MARK[style]}"
        out += inline(run[b:], rest)
    return out


def start(md: str) -> str:
    """Escapes what Markdown would read as a heading or a list at the start of a line."""
    return re.sub(r"^([#+=-])", r"\\\1", md)


def paragraphs(ls: list[list[Char]]) -> list[str]:
    """Blank lines end a paragraph; a single line break stays a line break; dash lines become a list."""
    out: list[str] = []
    cur: list[str] = []
    kind = ""

    def flush():
        nonlocal cur, kind
        if len(cur) == 1 and kind == "text" and (h := HEADING.match(cur[0])):
            out.append(f"## {h[1]}")
        elif cur:
            out.append(("\n" if kind == "list" else "\\\n").join(cur))
        cur, kind = [], ""

    items = [bool(ITEM.match(plain(l))) for l in ls]
    for i, l in enumerate(ls):
        text = plain(l)
        if not text:
            flush()
        elif RULE.match(text):
            flush()
            out.append("---")
        elif items[i] and (any(items[j] for j in (i - 1, i + 1) if 0 <= j < len(ls))):  # one dash line alone is a signature
            if kind != "list":
                flush()
            kind = "list"
            cur.append("- " + inline(l[ITEM.match(text).end():]))
        else:
            if kind == "list":
                flush()
            kind = "text"
            md = inline(l)
            if NUMBER.match(text) and cur:
                # "1. …" under text needs its own block to be a list; under another item it does not.
                last = cur[-1] if cur else ""
                if not NUMBER.match(last):
                    flush()
                    kind = "text"
                else:
                    cur[-1] += "\n" + md
                    continue
            cur.append(md if NUMBER.match(md) else start(md))
    flush()
    return out


def to_blocks(ls: list[list[Char]]) -> list[str]:
    out: list[str] = []
    kinds = [next((c.block for c in l if c.block), None if l else "blank") for l in ls]
    # A blank line inside a quote belongs to it.
    for i, k in enumerate(kinds):
        if k == "blank":
            left = next((x for x in reversed(kinds[:i]) if x != "blank"), None)
            right = next((x for x in kinds[i + 1:] if x != "blank"), None)
            kinds[i] = left if left == right else None
    for kind, group in groupby(zip(kinds, ls), key=lambda t: t[0]):
        part = [l for _, l in group]
        if kind == "quote":
            body = "\n\n".join(paragraphs(part))
            out.append("\n".join(("> " + x).rstrip() for x in body.split("\n")))
        elif kind == "pre":
            out.append("```\n" + "\n".join(plain(l) for l in part).replace("```", "'''") + "\n```")
        else:
            out += paragraphs(part)
    return [b for b in out if b.strip()]
