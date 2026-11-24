"""Long channel posts to draft posts for the site. Pure."""
import re
from dataclasses import dataclass
from datetime import datetime

from .markdown import Char, chars, lines, plain, to_blocks
from .notes import Note

LONG = 100
# Channel hashtags to the site's topics (src/data/ui.ts).
TOPICS = {"ai": "ai", "ші": "ai", "build": "eng", "songs": "music", "music": "music", "books": "books", "кнігі": "books", "мова": "lang"}
TAGS = re.compile(r"^(?:#\w+\s*)+$")
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍⃣]+")


@dataclass
class Draft:
    id: str
    notes: list[int]
    title: str
    lang: str
    topics: list[str]
    body: str
    date: datetime
    words: int
    """Links worth a look before publishing: they carry a referral or start code."""
    referrals: list[str]

    def document(self, now: datetime) -> dict:
        return {
            "originalLang": self.lang, "status": "draft", "topics": self.topics, "publishedAt": self.date, "updatedAt": now,
            "variants": {self.lang: {"title": self.title, "body": self.body}},
        }


def words(text: str) -> int:
    return sum(any(c.isalnum() for c in w) for w in text.split())


def language(text: str) -> str:
    cyr = len(re.findall(r"[Ѐ-ӿ]", text))
    return "be" if cyr > len(re.findall(r"[A-Za-z]", text)) else "en"


def is_long(n: Note) -> bool:
    """Albums with a place are already on the site, with their captions."""
    return not n.skip and not (n.place and n.photos) and words(n.text) > LONG


def clean_title(text: str) -> str:
    text = re.sub(r"\[\d+\]", "", EMOJI.sub("", text))
    return re.sub(r"\s+", " ", text).strip().strip("\"“”«»").rstrip(":.").strip()


def split_title(ls: list[list[Char]]) -> tuple[str, list[list[Char]]]:
    """The first line if it can stand as a title. It leaves the text unless it holds a link, opens a quote or leads into what follows."""
    i = next((k for k, l in enumerate(ls) if plain(l).strip()), None)
    if i is None:
        return "", ls
    first, title = ls[i], clean_title(plain(ls[i]))
    if title and len(title) <= 80:
        keep = any("link" in c.style or c.block for c in first) or plain(first).rstrip().endswith(":")
        return title, ls if keep else ls[i + 1:]
    short = title[:60].rsplit(" ", 1)[0].rstrip(",.;:–— ")
    return f"{short}…", ls


def make(ns: list[Note], photos: dict[str, list[dict]], media: str) -> Draft:
    """One draft from one note, or from several in a row; every part after the first gets its first line as a heading."""
    blocks: list[str] = []
    title, tags, links = "", [], []
    for k, n in enumerate(ns):
        cs = chars(n.raw, n.entities)
        ls = lines(cs)
        links += [c.style["link"] for c in cs if "link" in c.style]
        for l in [l for l in ls if TAGS.match(plain(l))]:
            tags += re.findall(r"#(\w+)", plain(l).lower())
            ls.remove(l)
        own, rest = split_title(ls)
        part = to_blocks(rest)
        if k == 0:
            title = own
        elif rest is not ls:
            part.insert(0, f"## {own}")
        pics = [f"![]({media}/{p['key']}-1600.webp)" for p in photos.get(n.id, [])]
        # After the first paragraph, so a post still opens with its initial letter.
        part[1:1] = pics
        blocks += part
    body = "\n\n".join(blocks) + "\n"
    text = "\n".join(n.raw for n in ns)
    return Draft(
        id=f"tg-{ns[0].id}", notes=[int(n.id) for n in ns], title=title, lang=language(text),
        topics=list(dict.fromkeys(TOPICS[t] for t in tags if t in TOPICS)), body=body, date=ns[0].date, words=words(text),
        referrals=sorted({u for u in links if re.search(r"[?&](?:start|startapp|ref|_tgr)=", u)}),
    )


class Unknown(Exception):
    pass


def choose(notes: list[Note], wanted: list[str], done: set[int]) -> tuple[list[list[Note]], list[list[Note]]]:
    """(asked for, long). `wanted` holds "142" or "136+137+138+139" (one post); long are those not asked for and not yet made into drafts."""
    by_id = {n.id: n for n in notes}
    out, used = [], set()
    for w in wanted:
        ids = w.split("+")
        if bad := [i for i in ids if i not in by_id or by_id[i].skip]:
            raise Unknown(f"No such post in the channel, or it is one the sync skips: {', '.join(bad)}")
        out.append([by_id[i] for i in ids])
        used |= {int(i) for i in ids}
    return out, [[n] for n in notes if is_long(n) and int(n.id) not in used | done]
