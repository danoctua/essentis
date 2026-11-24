import asyncio
import io
from datetime import datetime, timezone

import pytest
from PIL import Image

from tg_sync.notes import Msg, Photo
from tg_sync.sync import run

D = datetime(2026, 9, 26, tzinfo=timezone.utc)
buf = io.BytesIO()
Image.new("RGB", (1200, 800)).save(buf, "JPEG")
JPEG = buf.getvalue()


class Store:
    def __init__(self): self.docs, self.last, self.writes = {}, 0, 0
    def last_id(self): return self.last
    def set_last_id(self, n): self.last = n
    def notes(self): return {k: dict(v) for k, v in self.docs.items()}
    def put(self, i, d): self.docs[i] = d; self.writes += 1
    def hide(self, i): self.docs[i] |= {"hidden": True, "hiddenBy": "sync"}


class World:
    def __init__(self):
        self.store, self.files, self.msgs, self.downloads, self.broken = Store(), {}, [], [], set()

    def put(self, key, data): self.files[key] = data

    def sync(self, **k):
        async def fetch(floor): return [m for m in self.msgs if m.id > floor]

        async def download(p):
            self.downloads.append(p.id)
            if p.id in self.broken: raise RuntimeError("boom")
            return JPEG
        return asyncio.run(run(fetch, download, self.store, self, "essentis", log=lambda s: None, **k))


def album(first, n=3, text="Karkonosze // 2026", gid=13_800_000_000_000_000_001):
    return [Msg(id=first + i, date=D, text=text if i == 0 else "", grouped_id=gid, photos=[Photo(9000 + first + i)]) for i in range(n)]


@pytest.fixture
def w():
    x = World()
    x.msgs = [Msg(id=1, date=D, service=True), *album(216)]
    return x


def test_first_run(w):
    r = w.sync()
    doc = w.store.docs["216"]
    assert doc == {
        "date": D, "text": "Karkonosze // 2026", "place": "Karkonosze", "year": 2026, "hidden": False,
        "tgUrl": "https://t.me/essentis/216", "groupedId": "13800000000000000001",
        "photos": [{"key": f"notes/216/{9216 + i}-1200x800", "w": 1200, "h": 800} for i in range(3)],
    }
    assert set(w.files) == {f"notes/216/{9216 + i}-1200x800-{s}.webp" for i in range(3) for s in (400, 800, 1600)}
    assert w.store.last == 218 and r.photos == 3 and len(r.skipped) == 1


def test_again_does_nothing(w):
    w.sync(); w.downloads.clear(); w.store.writes = 0
    assert not w.sync().changed
    assert not w.sync(full=True).changed
    assert w.downloads == [] and w.store.writes == 0


def test_incremental_takes_only_new(w):
    w.sync(); w.downloads.clear()
    w.msgs.append(Msg(id=219, date=D, text="new"))
    r = w.sync()
    assert [n.id for n in r.added] == ["219"] and w.downloads == [] and w.store.last == 219


def test_album_cut_by_the_last_run_stays_one_note(w):
    whole = w.msgs
    w.msgs = whole[:3]  # 216, 217
    w.sync()
    w.msgs = whole
    r = w.sync()
    assert list(w.store.docs) == ["216"] and [n.id for n in r.updated] == ["216"]
    assert len(w.store.docs["216"]["photos"]) == 3 and w.downloads == [9216, 9217, 9218]


def test_full_sees_edits_replaced_photos_and_deletions(w):
    w.msgs.append(Msg(id=230, date=D, text="to be deleted"))
    w.sync(); w.downloads.clear()
    w.msgs.pop()
    w.msgs[1].text = "Śnieżka // 2026"
    w.msgs[2].photos = [Photo(5)]
    r = w.sync(full=True)
    assert r.hidden == ["230"] and w.store.docs["230"]["hidden"] and w.store.docs["216"]["place"] == "Śnieżka"
    assert w.store.docs["216"]["photos"][1]["key"] == "notes/216/5-1200x800" and w.downloads == [5]
    assert w.sync(full=True).hidden == []


def test_tagging_a_post_later_hides_it_and_untagging_brings_it_back(w):
    w.sync()
    w.msgs[1].text = "Karkonosze // 2026 #толькітг"
    w.sync(full=True)
    assert w.store.docs["216"]["hidden"]
    w.msgs[1].text = "Karkonosze // 2026"
    w.sync(full=True)
    assert w.store.docs["216"]["hidden"] is False


def test_hidden_by_hand_stays_hidden(w):
    w.sync()
    w.store.docs["216"]["hidden"] = True
    w.msgs[1].text = "Edited // 2026"
    w.sync(full=True)
    assert w.store.docs["216"]["hidden"] is True and w.store.docs["216"]["place"] == "Edited"


def test_dry_run_writes_nothing(w):
    r = w.sync(dry=True, full=True)
    assert len(r.added) == 1 and r.photos == 3
    assert not w.store.docs and not w.files and not w.downloads and w.store.last == 0


def test_a_failed_photo_is_retried_and_does_not_stop_the_rest(w):
    w.msgs.append(Msg(id=219, date=D, text="after"))
    w.broken = {9217}
    r = w.sync()
    assert [n.id for n, _ in r.failed] == ["216"] and list(w.store.docs) == ["219"] and w.store.last == 215
    w.broken = set()
    r = w.sync()
    assert [n.id for n in r.added] == ["216"] and w.store.last == 219


def test_a_failed_post_is_never_hidden(w):
    w.sync()
    w.msgs[1].photos = [Photo(5)]
    w.broken = {5}
    r = w.sync(full=True)
    assert r.failed and r.hidden == [] and not w.store.docs["216"]["hidden"]


def test_an_empty_channel_never_hides_everything(w):
    w.sync(); w.msgs = []
    with pytest.raises(RuntimeError):
        w.sync(full=True)
    assert not w.store.docs["216"]["hidden"]
