"""Build the Android launch splash from assets/splash.png.

The source is the full Path Connect splash (house, pipes, and title). Android 12
draws a centered icon unless the launch theme points at this artwork, so this
writes the full-screen drawables the theme and the activity use. It does not
touch the app icon or the iOS splash.

Usage: python3 scripts/build-android-splash.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/splash.png"
RES = ROOT / "android/app/src/main/res"

# Capacitor's portrait and landscape splash buckets, plus a sharp default.
SIZES = {
    "drawable": (1280, 1920),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}


def contain(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Fit the whole illustration on a canvas colored from its own edges."""
    width, height = size
    scale = min(width / source.width, height / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    top = source.getpixel((source.width // 2, 0))
    bottom = source.getpixel((source.width // 2, source.height - 1))
    strip = Image.new("RGB", (1, height))
    for y in range(height):
        blend = y / max(height - 1, 1)
        strip.putpixel(
            (0, y),
            tuple(round(top[channel] + (bottom[channel] - top[channel]) * blend) for channel in range(3)),
        )
    canvas = strip.resize((width, height), Image.Resampling.NEAREST)
    canvas.paste(resized, ((width - resized.width) // 2, (height - resized.height) // 2))
    return canvas


def square_icon(source: Image.Image, size: int) -> Image.Image:
    """The whole splash, letterboxed, for the Android 12 icon slot."""
    return contain(source, (size, size))


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing splash source: {SOURCE}")
    source = Image.open(SOURCE).convert("RGB")
    for folder, size in SIZES.items():
        out = RES / folder
        out.mkdir(parents=True, exist_ok=True)
        # WebP keeps the illustration sharp without a multi-megabyte PNG.
        # A leftover PNG of the same name would clash at resource-merge time.
        (out / "splash.png").unlink(missing_ok=True)
        contain(source, size).save(out / "splash.webp", "WEBP", quality=90, method=6)
        print(f"{folder}/splash.webp {size[0]}x{size[1]}")
    icon_dir = RES / "drawable-nodpi"
    icon_dir.mkdir(parents=True, exist_ok=True)
    (icon_dir / "splash_icon.png").unlink(missing_ok=True)
    square_icon(source, 768).save(icon_dir / "splash_icon.webp", "WEBP", quality=90, method=6)
    print("drawable-nodpi/splash_icon.webp 768x768")


if __name__ == "__main__":
    main()
