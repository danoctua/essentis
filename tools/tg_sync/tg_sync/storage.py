"""Uploads to Cloudflare R2 through its S3 API."""
import boto3
from botocore.config import Config as Boto

from .config import R2, Config


class Storage:
    def __init__(self, cfg: Config):
        cfg.need(*R2)
        self.bucket = cfg.get("R2_BUCKET")
        self.s3 = boto3.client(
            "s3",
            endpoint_url=cfg.get("R2_ENDPOINT") or f"https://{cfg.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
            aws_access_key_id=cfg.get("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=cfg.get("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
            # R2 does not take every checksum header newer boto3 adds by default.
            config=Boto(signature_version="s3v4", request_checksum_calculation="when_required", response_checksum_validation="when_required"),
        )

    def put(self, key: str, data: bytes) -> None:
        # Keys carry Telegram's photo id, so a file never changes under its name.
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType="image/webp", CacheControl="public, max-age=31536000, immutable")

    def check(self) -> None:
        """Writes, then removes, a one-byte object: the only honest test of write access."""
        self.s3.put_object(Bucket=self.bucket, Key="notes/_check", Body=b"1")
        self.s3.delete_object(Bucket=self.bucket, Key="notes/_check")
