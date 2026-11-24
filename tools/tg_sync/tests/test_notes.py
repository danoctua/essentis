from datetime import datetime, timezone

import pytest

from tg_sync.notes import Msg, Photo, group, parse_place

D = datetime(2026, 9, 26, tzinfo=timezone.utc)


def msg(i, text="", **k):
    return Msg(id=i, date=D, text=text, **k)


@pytest.mark.parametrize("text, expected", [
    ("🫴 🌳\n\nKarkonosze // 2026", ("Karkonosze", 2026)),
    ("The view takes it away.\n\n⛰⛰\n\nDurmitor, Montenegro // 2025", ("Durmitor, Montenegro", 2025)),
    ("🎻☕️\n\nÖsterreich, Wien // 2025", ("Österreich, Wien", 2025)),
    ("Interior. \n\nVenice, Italy // 2023 ", ("Venice, Italy", 2023)),
    ("📷 фота: Грац, Аўстрыя\n\nGraz, Austria // 2025", ("Graz, Austria", 2025)),
    ("Sharing thoughts\n\nNothing else, just personal //", (None, None)),
    ("Context: https://t.me/durov_russia/33", (None, None)),
    ("https://20daysinmariupol.com/", (None, None)),
    ("// 2023", (None, None)),
    ("", (None, None)),
])
def test_place(text, expected):
    assert parse_place(text) == expected


def test_album_is_one_note_with_the_caption_from_any_photo():
    notes = group([
        msg(218, grouped_id=7, photos=[Photo(3)]),
        msg(216, grouped_id=7, photos=[Photo(1)]),
        msg(217, "🌳\n\nKarkonosze // 2026", grouped_id=7, photos=[Photo(2)]),
        msg(219, "alone"),
    ])
    assert [n.id for n in notes] == ["216", "219"]
    assert notes[0].place == "Karkonosze" and [p.id for p in notes[0].photos] == [1, 2, 3]
    assert notes[0].last_id == 218 and notes[0].title == "Karkonosze // 2026"


@pytest.mark.parametrize("m, why", [
    (msg(1, service=True), "service message"),
    (msg(2, "Build", forwarded=True), "forwarded"),
    (msg(3, "Новы допіс: https://essentis.xyz/dopisy/x/"), "links to essentis.xyz"),
    (msg(4, "Новы допіс", urls=["https://www.essentis.xyz/"]), "links to essentis.xyz"),
    (msg(5, "Толькі тут #ТолькіТГ"), "#толькітг"),
    (msg(6), "no text or photos"),
    (msg(7, "t.me/essentis"), None),
    (msg(8, "notessentis.xyz"), None),
    (msg(9, "#толькітгсёньня"), None),
    (msg(10, photos=[Photo(1)]), None),
])
def test_skips(m, why):
    assert group([m])[0].skip == why


def test_one_tag_skips_the_whole_album():
    assert group([msg(1, grouped_id=1, photos=[Photo(1)]), msg(2, "#толькітг", grouped_id=1, photos=[Photo(2)])])[0].skip == "#толькітг"
