"""The only file that talks to Telegram."""
import getpass
import os
from contextlib import asynccontextmanager

from telethon import TelegramClient
from telethon.tl import types as tl

from .config import TELEGRAM, Config, ConfigError
from .notes import Msg, Photo

MAX_FILE = 20 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def to_msg(m) -> Msg:
    out = Msg(id=m.id, date=m.date, grouped_id=getattr(m, "grouped_id", None), edit_date=getattr(m, "edit_date", None))
    if isinstance(m, tl.MessageService):
        out.service = True
        return out
    out.text = m.message or ""
    out.forwarded = m.fwd_from is not None
    out.urls = [e.url for e in m.entities or [] if isinstance(e, tl.MessageEntityTextUrl)]
    media = m.media
    # Not m.photo: for a link it returns the picture of the link's preview.
    if isinstance(media, tl.MessageMediaWebPage) and isinstance(media.webpage, tl.WebPage):
        out.urls.append(media.webpage.url)
    elif isinstance(media, tl.MessageMediaPhoto) and isinstance(media.photo, tl.Photo):
        if media.spoiler:
            out.warnings.append("a photo under a spoiler was left out")
        else:
            out.photos = [Photo(media.photo.id, m)]
    elif isinstance(media, tl.MessageMediaDocument) and isinstance(media.document, tl.Document):
        doc = media.document
        sticker = any(isinstance(a, tl.DocumentAttributeSticker) for a in doc.attributes)
        if doc.mime_type in IMAGE_TYPES and not sticker:
            if doc.size > MAX_FILE:
                out.warnings.append(f"an image file of {doc.size // 2**20} MB was left out (the limit is 20 MB)")
            elif media.spoiler:
                out.warnings.append("a photo under a spoiler was left out")
            else:
                out.photos = [Photo(doc.id, m)]
        elif (doc.mime_type or "").startswith("image/") and not sticker and doc.mime_type != "image/gif":
            out.warnings.append(f"an image file of type {doc.mime_type} was left out")
    return out


def _client(cfg: Config) -> TelegramClient:
    cfg.need(*TELEGRAM)
    try:
        api_id = int(cfg.get("TG_API_ID"))
    except ValueError:
        raise ConfigError("TG_API_ID must be a number.") from None
    cfg.session.parent.mkdir(mode=0o700, exist_ok=True)
    # The session file is a login to the whole account: readable by this user only, from its first byte.
    os.umask(0o077)
    return TelegramClient(str(cfg.session), api_id, cfg.get("TG_API_HASH"), flood_sleep_threshold=300)


async def login(cfg: Config) -> str:
    client = _client(cfg)
    await client.start(
        phone=lambda: input("Phone number (with country code): ").strip(),
        code_callback=lambda: input("Code from Telegram: ").strip(),
        password=lambda: getpass.getpass("Two-step password: "),
    )
    try:
        me = await client.get_me()
        os.chmod(cfg.session, 0o600)
        return f"@{me.username}" if me.username else "your account"
    finally:
        await client.disconnect()


class Channel:
    def __init__(self, client: TelegramClient, entity):
        self.client, self.entity = client, entity

    async def fetch(self, min_id: int) -> list[Msg]:
        return [to_msg(m) async for m in self.client.iter_messages(self.entity, min_id=min_id, reverse=True)]

    async def download(self, photo: Photo) -> bytes:
        data = await self.client.download_media(photo.source, file=bytes)
        if not data:
            raise RuntimeError("Telegram returned an empty file")
        return data


@asynccontextmanager
async def channel(cfg: Config):
    if not cfg.session.exists():
        raise ConfigError("Not signed in to Telegram. Run: npm run tg:login")
    client = _client(cfg)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise ConfigError(f"The Telegram session has ended. Delete {cfg.session} and run: npm run tg:login")
        yield Channel(client, await client.get_entity(cfg.channel))
    finally:
        await client.disconnect()
