import io

from PIL import Image

from tg_sync.images import webp_sizes


def jpeg(w, h, exif=None, mode="RGB"):
    buf = io.BytesIO()
    Image.new(mode, (w, h), 120).save(buf, "PNG" if mode in ("RGBA", "LA", "P") else "JPEG", **({"exif": exif} if exif else {}))
    return buf.getvalue()


def opened(files):
    return {w: Image.open(io.BytesIO(d)) for w, d in files.items()}


def test_sizes_never_upscale():
    w, h, files = webp_sizes(jpeg(1280, 960))
    assert (w, h) == (1280, 960)
    assert {k: i.size for k, i in opened(files).items()} == {400: (400, 300), 800: (800, 600), 1600: (1280, 960)}
    assert all(i.format == "WEBP" for i in opened(files).values())


def test_exif_is_gone_and_orientation_applied():
    exif = Image.Exif()
    exif[0x0112] = 6  # rotated 90°
    exif[0x010F] = "SecretCamera"
    exif.get_ifd(0x8825)[1] = "N"
    w, h, files = webp_sizes(jpeg(1000, 500, exif))
    assert (w, h) == (500, 1000)
    for data in files.values():
        assert b"SecretCamera" not in data and b"EXIF" not in data
        assert not Image.open(io.BytesIO(data)).getexif()


def test_odd_modes_and_tiny_images():
    for mode in ("L", "CMYK", "RGBA", "P"):
        assert webp_sizes(jpeg(50, 40, mode=mode))[:2] == (50, 40)
    assert opened(webp_sizes(jpeg(2000, 1))[2])[400].size == (400, 1)
