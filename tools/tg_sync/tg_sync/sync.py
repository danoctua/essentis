"""Decides what to write. Talks to the channel, Firestore and R2 only through the objects it is given."""
import re
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from .images import webp_sizes
from .notes import Msg, Note, Photo, group

# An album holds up to 10 messages. Reading this far back keeps one that was cut by the last run whole.
OVERLAP = 50


@dataclass
class Result:
    added: list[Note] = field(default_factory=list)
    updated: list[Note] = field(default_factory=list)
    same: list[Note] = field(default_factory=list)
    skipped: list[Note] = field(default_factory=list)
    hidden: list[str] = field(default_factory=list)
    failed: list[tuple[Note, str]] = field(default_factory=list)
    photos: int = 0

    @property
    def changed(self) -> bool:
        return bool(self.added or self.updated or self.hidden)


def stored_photo(old: dict | None, note_id: str, photo_id: int) -> dict | None:
    """A photo the last run already uploaded: its key carries Telegram's photo id."""
    for p in (old or {}).get("photos") or []:
        if re.fullmatch(rf"notes/{note_id}/{photo_id}-\d+x\d+", p.get("key", "")):
            return p
    return None


def document(note: Note, photos: list[dict], channel: str, old: dict | None) -> dict:
    # A note the owner hid by hand stays hidden; one the sync hid comes back with its post.
    by_hand = bool(old and old.get("hidden") and old.get("hiddenBy") != "sync")
    doc = {"date": note.date, "text": note.text, "photos": photos, "tgUrl": f"https://t.me/{channel}/{note.id}", "hidden": by_hand}
    if note.place:
        doc |= {"place": note.place, "year": note.year}
    if note.grouped_id:
        doc["groupedId"] = str(note.grouped_id)  # 64-bit: JavaScript numbers cannot hold it
    if note.edit_date:
        doc["editDate"] = note.edit_date
    return doc


def same(a: dict | None, b: dict) -> bool:
    ignore = {"editDate"}  # Telegram bumps it for reactions too
    strip = lambda d: {k: v for k, v in d.items() if k not in ignore}
    return a is not None and strip(a) == strip(b)


async def run(
    fetch: Callable[[int], Awaitable[list[Msg]]],
    download: Callable[[Photo], Awaitable[bytes]],
    store, storage, channel: str,
    *, full: bool = False, dry: bool = False, log: Callable[[str], None] = print,
) -> Result:
    last = store.last_id()
    floor = 0 if full else max(0, last - OVERLAP)
    msgs = await fetch(floor)
    if full and not msgs:
        raise RuntimeError("The channel returned no messages; nothing was changed.")
    notes = [n for n in group(msgs) if full or n.last_id > last]
    old = store.notes()
    r = Result()
    for note in notes:
        for w in note.warnings:
            log(f"  ! {note.id}: {w}")
        if note.skip:
            r.skipped.append(note)
            continue
        try:
            photos, new = [], 0
            for p in note.photos:
                if kept := stored_photo(old.get(note.id), note.id, p.id):
                    photos.append(kept)
                    continue
                new += 1
                if dry:
                    continue
                w, h, files = webp_sizes(await download(p))
                key = f"notes/{note.id}/{p.id}-{w}x{h}"
                for width, data in files.items():
                    storage.put(f"{key}-{width}.webp", data)
                photos.append({"key": key, "w": w, "h": h})
            doc = document(note, photos, channel, old.get(note.id))
            if not new and same(old.get(note.id), doc):
                r.same.append(note)
                continue
            if not dry:
                store.put(note.id, doc)  # after every photo is up, so a note never points at a missing file
            r.photos += new
            (r.updated if note.id in old else r.added).append(note)
            log(f"  {'~' if note.id in old else '+'} {note.id:>4}  {note.date:%Y-%m-%d}  {len(note.photos):>2} photos  {note.title}")
        except Exception as e:  # one bad post must not stop the rest
            r.failed.append((note, f"{type(e).__name__}: {e}"))
            log(f"  x {note.id:>4}  {type(e).__name__}: {e}")
    if full:
        keep = {n.id for n in notes if not n.skip}
        for i in sorted(set(old) - keep, key=lambda s: int(s) if s.isdigit() else 0):
            if old[i].get("hidden"):
                continue
            r.hidden.append(i)
            log(f"  - {i:>4}  gone from the channel, hidden")
            if not dry:
                store.hide(i)
    if not dry and msgs:
        seen = max(m.id for m in msgs)
        # Start before the first failure next time.
        store.set_last_id(min(int(n.id) for n, _ in r.failed) - 1 if r.failed else max(last, seen))
    return r
