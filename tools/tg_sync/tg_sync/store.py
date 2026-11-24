"""Firestore: notes/{id} and sync/telegram."""
from datetime import datetime, timezone

from google.api_core.exceptions import Conflict
from google.cloud import firestore

from .config import EMULATOR_PROJECT, Config


class Store:
    def __init__(self, cfg: Config):
        if cfg.emulator:
            self.db = firestore.Client(project=EMULATOR_PROJECT)
        else:
            sa = cfg.service_account()
            self.db = firestore.Client.from_service_account_info(sa, project=sa["project_id"])
        self.where = "the emulator" if cfg.emulator else self.db.project

    def last_id(self) -> int:
        d = self.db.document("sync/telegram").get()
        return int((d.to_dict() or {}).get("lastMessageId") or 0)

    def set_last_id(self, n: int) -> None:
        self.db.document("sync/telegram").set({"lastMessageId": n, "lastRunAt": datetime.now(timezone.utc)}, merge=True)

    def notes(self) -> dict[str, dict]:
        return {d.id: d.to_dict() for d in self.db.collection("notes").stream()}

    def put(self, note_id: str, doc: dict) -> None:
        self.db.document(f"notes/{note_id}").set(doc)

    def hide(self, note_id: str) -> None:
        self.db.document(f"notes/{note_id}").update({"hidden": True, "hiddenBy": "sync"})

    def drafted(self) -> set[int]:
        """Posts already made into drafts. Kept apart from the drafts, so one the owner deleted does not come back."""
        d = self.db.document("sync/telegram").get()
        return set((d.to_dict() or {}).get("drafted") or [])

    def add_draft(self, draft_id: str, doc: dict, notes: list[int]) -> bool:
        """Never touches a post that exists: it may have been edited or published."""
        try:
            self.db.document(f"posts/{draft_id}").create(doc)
        except Conflict:
            return False
        self.db.document("sync/telegram").set({"drafted": firestore.ArrayUnion(notes)}, merge=True)
        return True

    def published(self) -> None:
        """The admin shows this as the last rebuild."""
        self.db.document("meta/publish").set({"lastAt": datetime.now(timezone.utc), "lastError": None}, merge=True)
