"""Photos to WebP at the three widths the site uses. Keep in step with src/lib/media.ts and src/admin/images.ts."""
import io

from PIL import Image, ImageOps

WIDTHS = (400, 800, 1600)
QUALITY = 82


def webp_sizes(data: bytes) -> tuple[int, int, dict[int, bytes]]:
    """(width, height, {400: bytes, ...}). Never upscales. Drops EXIF (GPS, device); keeps the colour profile."""
    with Image.open(io.BytesIO(data)) as src:
        img = ImageOps.exif_transpose(src)
        icc = src.info.get("icc_profile") if src.mode in ("RGB", "RGBA") else None
        if img.mode != "RGB":
            rgba = img.convert("RGBA")
            img = Image.new("RGB", rgba.size, "white")
            img.paste(rgba, mask=rgba.getchannel("A"))
        out = {}
        for width in WIDTHS:
            w = min(width, img.width)
            h = max(1, round(img.height * w / img.width))
            buf = io.BytesIO()
            extra = {"icc_profile": icc} if icc else {}
            (img if w == img.width else img.resize((w, h), Image.Resampling.LANCZOS)).save(buf, "WEBP", quality=QUALITY, method=6, exif=b"", xmp=b"", **extra)
            out[width] = buf.getvalue()
        return img.width, img.height, out
