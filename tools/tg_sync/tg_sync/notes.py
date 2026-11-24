"""Channel messages to notes. Pure: no network, covered by tests."""
import re
from dataclasses import dataclass, field
from datetime import datetime

# "Venice, Italy // 2023" on a line of its own.
PLACE = re.compile(r"^(?P<place>\S.*?)\s*//\s*(?P<year>(?:19|20)\d{2})$")
SITE = re.compile(r"(?<![\w-])essentis\.xyz(?![\w-])", re.IGNORECASE)
SKIP_TAG = re.compile(r"(?<![\w#])#толькітг(?!\w)", re.IGNORECASE)


@dataclass
class Photo:
    id: int
    """The Telegram message or a test double; only the downloader looks inside."""
    source: object = None


@dataclass
class Msg:
    id: int
    date: datetime
    text: str = ""
    urls: list[str] = field(default_factory=list)
    grouped_id: int | None = None
    edit_date: datetime | None = None
    service: bool = False
    forwarded: bool = False
    photos: list[Photo] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class Note:
    id: str
    last_id: int
    date: datetime
    text: str
    place: str | None
    year: int | None
    photos: list[Photo]
    grouped_id: int | None
    edit_date: datetime | None
    skip: str | None
    warnings: list[str]

    @property
    def title(self) -> str:
        if self.place:
            return f"{self.place} // {self.year}"
        return (self.text.strip().split("\n")[0] or "(no text)")[:60]


def parse_place(text: str) -> tuple[str | None, int | None]:
    """The last "Place // Year" line of a caption."""
    for line in reversed(text.splitlines()):
        if m := PLACE.match(line.strip()):
            return m["place"], int(m["year"])
    return None, None


def skip_reason(msgs: list[Msg]) -> str | None:
    if all(m.service for m in msgs):
        return "service message"
    if any(m.forwarded for m in msgs):
        return "forwarded"
    for m in msgs:
        if SKIP_TAG.search(m.text):
            return "#толькітг"
        if any(SITE.search(s) for s in [m.text, *m.urls]):
            return "links to essentis.xyz"
    if not any(m.text.strip() or m.photos for m in msgs):
        return "no text or photos"
    return None


def group(msgs: list[Msg]) -> list[Note]:
    """One note per message, or per album. An album's note takes its lowest message id."""
    groups: dict[object, list[Msg]] = {}
    for m in sorted(msgs, key=lambda m: m.id):
        groups.setdefault(("album", m.grouped_id) if m.grouped_id else m.id, []).append(m)
    notes = []
    for ms in groups.values():
        # The caption can sit on any photo of the album.
        text = next((m.text.strip() for m in ms if m.text.strip()), "")
        place, year = parse_place(text)
        edits = [m.edit_date for m in ms if m.edit_date]
        notes.append(Note(
            id=str(ms[0].id), last_id=ms[-1].id, date=ms[0].date, text=text, place=place, year=year,
            photos=[p for m in ms for p in m.photos], grouped_id=ms[0].grouped_id,
            edit_date=max(edits) if edits else None, skip=skip_reason(ms), warnings=[w for m in ms for w in m.warnings],
        ))
    return sorted(notes, key=lambda n: int(n.id))
