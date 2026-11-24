import asyncio
from datetime import datetime, timezone

import pytest
from telethon import errors
from telethon.tl import types as tl

from tg_sync import telegram

from tg_sync.config import ROOT, Config, ConfigError
from tg_sync.notes import group
from tg_sync.telegram import to_msg

D = datetime(2026, 9, 26, tzinfo=timezone.utc)
PEER = tl.PeerChannel(1)


def message(text="", media=None, entities=None, **k):
    return tl.Message(id=5, peer_id=PEER, date=D, message=text, media=media, entities=entities, **k)


def photo(i=42):
    return tl.Photo(id=i, access_hash=1, file_reference=b"", date=D, sizes=[], dc_id=1)


def document(mime, size=1000, attributes=()):
    return tl.MessageMediaDocument(document=tl.Document(id=43, access_hash=1, file_reference=b"", date=D, mime_type=mime, size=size, dc_id=1, attributes=list(attributes)))


def test_photo_and_image_file():
    assert to_msg(message("x", tl.MessageMediaPhoto(photo=photo()))).photos[0].id == 42
    assert to_msg(message("x", document("image/jpeg"))).photos[0].id == 43


def test_what_is_not_a_photo():
    sticker = tl.DocumentAttributeSticker(alt="", stickerset=tl.InputStickerSetEmpty())
    preview = tl.WebPage(id=1, url="https://x.com/a", display_url="x.com", hash=0, photo=photo())
    for media in [document("video/mp4"), document("image/gif"), document("image/webp", attributes=[sticker]), tl.MessageMediaWebPage(webpage=preview)]:
        assert to_msg(message("x", media)).photos == []
    big = to_msg(message("x", document("image/png", 21 * 2**20)))
    assert big.photos == [] and big.warnings
    hidden = to_msg(message("x", tl.MessageMediaPhoto(photo=photo(), spoiler=True)))
    assert hidden.photos == [] and hidden.warnings


def test_links_hidden_in_text_and_previews_count_as_links():
    link = [tl.MessageEntityTextUrl(offset=0, length=4, url="https://essentis.xyz/dopisy/a/")]
    preview = tl.WebPage(id=1, url="https://essentis.xyz/", display_url="", hash=0)
    for m in [message("тут", entities=link), message("тут", tl.MessageMediaWebPage(webpage=preview))]:
        assert group([to_msg(m)])[0].skip == "links to essentis.xyz"


def test_service_and_forwarded():
    s = tl.MessageService(id=1, peer_id=PEER, date=D, action=tl.MessageActionChannelCreate(title="x"))
    assert to_msg(s).service
    assert to_msg(message("x", fwd_from=tl.MessageFwdHeader(date=D))).forwarded


def test_config():
    c = Config({"TG_API_ID": "  # from my.telegram.org", "TG_CHANNEL": "@essentis", "TG_SESSION": "sessions/essentis"})
    assert c.missing("TG_API_ID") == ["TG_API_ID"] and c.channel == "essentis"
    assert c.session == ROOT / "sessions/essentis.session"


class Client:
    """Enough of TelegramClient to walk through a QR login."""
    def __init__(self, waits): self.waits, self.passwords, self.recreated = list(waits), [], 0
    url, expires = "tg://login?token=x", D
    async def qr_login(self): return self
    async def recreate(self): self.recreated += 1
    async def is_user_authorized(self): return False
    async def wait(self):
        if (e := self.waits.pop(0)): raise e
    async def sign_in(self, password):
        self.passwords.append(password)
        if password == "bad": raise errors.PasswordHashInvalidError(None)


def test_qr_login_renews_then_asks_for_the_password(monkeypatch, capsys):
    answers = iter(["bad", "good"])
    monkeypatch.setattr(telegram.getpass, "getpass", lambda _: next(answers))
    c = Client([asyncio.TimeoutError(), errors.SessionPasswordNeededError(None)])
    asyncio.run(telegram._by_qr(c))
    assert c.recreated == 1 and c.passwords == ["bad", "good"] and "█" in capsys.readouterr().out


def test_qr_login_without_a_password():
    c = Client([None])
    asyncio.run(telegram._by_qr(c))
    assert c.passwords == []


def test_phone_login_says_where_the_code_went_or_that_there_is_none(monkeypatch, capsys):
    class Phone:
        def __init__(self, how): self.how = how
        async def send_code_request(self, phone): return tl.auth.SentCode(type=self.how, phone_code_hash="SECRET")
        async def sign_in(self, phone, code, phone_code_hash): assert (code, phone_code_hash) == ("12345", "SECRET")
    monkeypatch.setattr("builtins.input", lambda q: "12345" if "Code" in q else "+10000000000")
    asyncio.run(telegram._by_phone(Phone(tl.auth.SentCodeTypeApp(length=5))))
    assert "Telegram app" in capsys.readouterr().out
    with pytest.raises(ConfigError, match="QR"):
        asyncio.run(telegram._by_phone(Phone(tl.auth.SentCodeTypeSetUpEmailRequired())))
