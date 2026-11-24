"""login | check | sync (the default)."""
import argparse
import asyncio
import logging
import sqlite3
import sys
import urllib.error
import urllib.request

from botocore.exceptions import BotoCoreError, ClientError

from .config import R2, Config, ConfigError
from .storage import Storage
from .store import Store
from .sync import Result, run
from . import telegram


def publish(cfg: Config, store: Store) -> None:
    try:
        req = urllib.request.Request(cfg.get("VERCEL_DEPLOY_HOOK_URL"), method="POST")
        urllib.request.urlopen(req, timeout=30).close()
    except urllib.error.URLError as e:
        # The hook URL is a secret; the error must not print it.
        raise ConfigError(f"The rebuild did not start: {getattr(e, 'code', None) or e.reason}") from None
    except ValueError:
        raise ConfigError("VERCEL_DEPLOY_HOOK_URL is not a URL.") from None
    store.published()
    print("The site is rebuilding.")


def report(r: Result, dry: bool) -> None:
    would = "Would write" if dry else "Wrote"
    print(f"\n{would}: {len(r.added)} new, {len(r.updated)} updated, {r.photos} photos. Unchanged: {len(r.same)}.")
    if r.hidden:
        print(f"{'Would hide' if dry else 'Hid'}: {len(r.hidden)}.")
    if r.skipped:
        why: dict[str, list[str]] = {}
        for n in r.skipped:
            why.setdefault(n.skip, []).append(n.id)
        print("Skipped: " + "; ".join(f"{k}: {', '.join(v)}" for k, v in why.items()) + ".")
    if r.failed:
        print(f"Failed: {', '.join(n.id for n, _ in r.failed)}. Run the same command again to retry.")


async def sync(cfg: Config, a: argparse.Namespace) -> int:
    if not a.dry_run:
        cfg.need(*R2)
    if a.publish and not a.dry_run:
        cfg.need("VERCEL_DEPLOY_HOOK_URL")
    store = Store(cfg)
    storage = None if a.dry_run else Storage(cfg)
    if storage:
        storage.check()
    print(f"Channel: t.me/{cfg.channel}. Firestore: {store.where}.{' Dry run: nothing is written.' if a.dry_run else ''}")
    async with telegram.channel(cfg) as ch:
        r = await run(ch.fetch, ch.download, store, storage, cfg.channel, full=a.full, dry=a.dry_run)
    report(r, a.dry_run)
    if a.publish and not a.dry_run:
        if r.changed:
            publish(cfg, store)
        else:
            print("Nothing changed, so the site was not rebuilt.")
    return 1 if r.failed else 0


async def check(cfg: Config) -> int:
    bad = 0

    async def step(name, fn):
        nonlocal bad
        try:
            out = fn()
            print(f"  ok   {name}: {await out if asyncio.iscoroutine(out) else out}")
        except Exception as e:
            bad += 1
            print(f"  FAIL {name}: {e}")

    async def tg():
        async with telegram.channel(cfg) as ch:
            return f"signed in, channel \"{ch.entity.title}\""

    def r2():
        s = Storage(cfg)
        s.check()
        return f"can write to {s.bucket}"

    def fs():
        s = Store(cfg)
        return f"{s.where}, {len(s.notes())} notes, last message {s.last_id()}"

    await step("Telegram", tg)
    await step("Firestore", fs)
    await step("R2", r2)
    print(f"  {'ok  ' if cfg.get('VERCEL_DEPLOY_HOOK_URL') else 'none'} Deploy hook (only for --publish)")
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="tg_sync", description="Copies posts from the essentis channel to the site.")
    p.add_argument("command", nargs="?", choices=["sync", "login", "check"], default="sync")
    p.add_argument("--full", action="store_true", help="re-read every post: edits, and posts deleted from the channel")
    p.add_argument("--dry-run", action="store_true", help="show what would happen; write nothing")
    p.add_argument("--phone", action="store_true", help="login: with a code from Telegram instead of a QR code")
    p.add_argument("--debug", action="store_true", help="log the conversation with Telegram (request names, no contents)")
    p.add_argument("--publish", action="store_true", help="rebuild the site at the end, if anything changed")
    a = p.parse_args(argv)
    if a.debug:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s", datefmt="%H:%M:%S")
        logging.getLogger("tg_sync").setLevel(logging.DEBUG)
        logging.getLogger("telethon").setLevel(logging.DEBUG)
    cfg = Config()
    try:
        if a.command == "login":
            print(f"Signed in as {asyncio.run(telegram.login(cfg, a.phone))}. Session: {cfg.session}")
            return 0
        return asyncio.run(check(cfg) if a.command == "check" else sync(cfg, a))
    except ConfigError as e:
        print(e, file=sys.stderr)
        return 2
    except sqlite3.OperationalError:
        print("The Telegram session is in use: stop the other tg:login or tg:sync first (Ctrl+C there).", file=sys.stderr)
        return 2
    except (BotoCoreError, ClientError) as e:
        print(f"R2 refused: {e}. Check the R2_* values and that the token may write to this bucket.", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nStopped. Run it again to continue.", file=sys.stderr)
        return 130
