from datetime import datetime, timezone

import pytest
from telethon.extensions import html
from telethon.helpers import add_surrogate
from telethon.tl import types as tl

from tg_sync import drafts
from tg_sync.markdown import chars, lines, to_blocks
from tg_sync.notes import Msg, Photo, group

D = datetime(2025, 5, 23, tzinfo=timezone.utc)


def md(source):
    text, entities = html.parse(source)
    return "\n\n".join(to_blocks(lines(chars(text, entities))))


@pytest.mark.parametrize("source, expected", [
    ("a <b>b</b> <i>c</i> <s>d</s> <code>e</code>", "a **b** *c* ~~d~~ `e`"),
    ("over 2<b> million </b>users", "over 2 **million** users"),
    ("4<b>. Use Strong 2FA  </b>", "4. **Use Strong 2FA**"),
    ("<b>Try an </b><a href=\"https://f.com\"><b>X</b></a>", "**Try an** [**X**](https://f.com)"),
    ("<a href=\"https://a.com/b_(c)\">[1]</a>", r"[\[1\]](https://a.com/b_%28c%29)"),
    ("snake_case * [x] &lt;b&gt; `y`", r"snake\_case \* \[x\] \<b\> \`y\`"),
    ("# not a heading", r"\# not a heading"),
    ("one\ntwo\n\nthree", "one\\\ntwo\n\nthree"),
    ("Because:\n— No\n— Yes\nEnd", "Because:\n\n- No\n- Yes\n\nEnd"),
    ("«цытата»\n— Аўтар", "«цытата»\\\n— Аўтар"),
    ("—\n", "---"),
    ("Text:\n1. One\n2. Two", "Text:\n\n1. One\n2. Two"),
    ("<blockquote>q1\n\nq2</blockquote>\nafter", "> q1\n>\n> q2\n\nafter"),
    ("<b>History</b>\n\nText", "## History\n\nText"),
    ("<b>What now?</b>\n\nText", "**What now?**\n\nText"),
    ("a​b 🧠 c", "ab 🧠 c"),
])
def test_markdown(source, expected):
    assert md(source) == expected


def test_custom_emoji_go_without_leaving_gaps_and_offsets_survive_surrogates():
    text = "🧠 Think of 📱 Amazon 📱: well"
    sur = add_surrogate(text)
    custom = [i for i in range(len(sur) - 1) if sur[i:i + 2] == add_surrogate("📱")]
    ents = [tl.MessageEntityCustomEmoji(offset=i, length=2, document_id=1) for i in custom]
    ents.append(tl.MessageEntityBold(offset=sur.index("Amazon"), length=6))
    assert to_blocks(lines(chars(text, ents))) == ["🧠 Think of **Amazon**: well"]


def test_bare_links_and_mentions():
    text = "see a.com/x_y and https://b.com/c_d by @some_one"
    e = [tl.MessageEntityUrl(4, 9), tl.MessageEntityUrl(18, 17), tl.MessageEntityMention(39, 9)]
    assert to_blocks(lines(chars(text, e))) == [r"see [a.com/x\_y](https://a.com/x_y) and <https://b.com/c_d> by [@some\_one](https://t.me/some_one)"]


def test_pre():
    text = "run\nx = 1\n\ny_2"
    assert to_blocks(lines(chars(text, [tl.MessageEntityPre(4, 10, "py")]))) == ["run", "```\nx = 1\n\ny_2\n```"]


def note(i, text, **k):
    return group([Msg(id=i, date=D, text=text, **k)])[0]


LONG = "Загаловак 🧠\n\n" + "слова " * 101 + "\n\n#ai #ші #build"


def test_draft():
    d = drafts.make([note(183, LONG)], {"183": [{"key": "notes/183/9-30x40"}]}, "https://m")
    assert (d.id, d.title, d.lang, d.topics) == ("tg-183", "Загаловак", "be", ["ai", "eng"])
    assert d.body.startswith("слова") and "#ai" not in d.body
    assert d.body.rstrip().endswith("![](https://m/notes/183/9-30x40-1600.webp)")
    doc = d.document(D)
    assert doc["status"] == "draft" and "slug" not in doc and doc["publishedAt"] == D and list(doc["variants"]) == ["be"]


def test_a_series_is_one_draft_with_headings():
    d = drafts.make([note(1, "First part\n\nIntro"), note(2, "Second part\n\nMore")], {}, "https://m")
    assert d.title == "First part" and d.body == "Intro\n\n## Second part\n\nMore\n" and d.notes == [1, 2]


@pytest.mark.parametrize("text, title, starts", [
    ("Дык вось, што адбылося:\n\nТэкст", "Дык вось, што адбылося", "Дык вось"),
    ("This is a very long first line that cannot possibly stand as a title because it goes on\n\nx", "This is a very long first line that cannot possibly stand…", "This is"),
    ("A title\n\nBody", "A title", "Body"),
])
def test_titles(text, title, starts):
    d = drafts.make([note(1, text)], {}, "https://m")
    assert d.title == title and d.body.startswith(starts)


def test_choose():
    ns = group([Msg(id=1, date=D, text=LONG), Msg(id=2, date=D, text="short"), Msg(id=3, date=D, text=LONG, forwarded=True),
                Msg(id=4, date=D, text=LONG + "\nWien // 2025", photos=[Photo(1)]), Msg(id=5, date=D, text=LONG), Msg(id=6, date=D, text=LONG)])
    asked, long = drafts.choose(ns, ["2+5"], {6})
    assert [[n.id for n in g] for g in asked] == [["2", "5"]] and [[n.id for n in g] for g in long] == [["1"]]
    for bad in ("99", "3"):
        with pytest.raises(drafts.Unknown):
            drafts.choose(ns, [bad], set())


def test_referral_links_are_pointed_out():
    link = [tl.MessageEntityTextUrl(0, 1, "https://t.me/bot?start=123")]
    assert drafts.make([note(1, "x y", entities=link)], {}, "https://m").referrals == ["https://t.me/bot?start=123"]
