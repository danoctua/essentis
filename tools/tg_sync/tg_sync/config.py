"""Settings from the environment, tools/tg_sync/.env and the repo's .env, in that order."""
import base64
import json
import os
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[3]
EMULATOR_PROJECT = "demo-essentis"
DEFAULTS = {
    "TG_CHANNEL": "essentis",
    "TG_SESSION": "sessions/essentis.session",
    "R2_BUCKET": "essentis-media",
    "PUBLIC_MEDIA_URL": "https://media.essentis.xyz",
}
TELEGRAM = ("TG_API_ID", "TG_API_HASH")
R2 = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")


class ConfigError(Exception):
    pass


class Config:
    def __init__(self, values: dict[str, str | None] | None = None):
        if values is None:
            values = {**dotenv_values(ROOT / ".env"), **dotenv_values(ROOT / "tools/tg_sync/.env"), **os.environ}
        # "KEY=   # comment" copied from .env.example reads as a value that starts with "#".
        self._v = {k: v.strip() for k, v in values.items() if v and v.strip() and not v.strip().startswith("#")}

    def get(self, name: str) -> str | None:
        return self._v.get(name) or DEFAULTS.get(name)

    def missing(self, *names: str) -> list[str]:
        return [n for n in names if not self.get(n)]

    def need(self, *names: str) -> None:
        if gone := self.missing(*names):
            raise ConfigError(f"Not set: {', '.join(gone)}. TG_* go into tools/tg_sync/.env, the rest into .env.")

    @property
    def channel(self) -> str:
        return self.get("TG_CHANNEL").removeprefix("https://t.me/").lstrip("@")

    @property
    def session(self) -> Path:
        """Always under the repo, wherever the command runs: Telethon creates a session at any path it is given."""
        p = Path(self.get("TG_SESSION"))
        p = p if p.is_absolute() else ROOT / p
        return p if p.suffix == ".session" else p.with_name(p.name + ".session")

    @property
    def emulator(self) -> bool:
        return bool(self.get("FIRESTORE_EMULATOR_HOST"))

    def service_account(self) -> dict:
        self.need("FIREBASE_SERVICE_ACCOUNT")
        raw = self.get("FIREBASE_SERVICE_ACCOUNT")
        try:
            return json.loads(raw if raw.startswith("{") else base64.b64decode(raw))
        except ValueError:
            # Never echo the value: it is a private key.
            raise ConfigError("FIREBASE_SERVICE_ACCOUNT is not base64 of the service account JSON.") from None
