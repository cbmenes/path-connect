"""Builds the iOS launch splash from the "Pipe Connect" illustration.

The splash asset is a 2732 square shown with aspect fill. A portrait iPhone
shows about the middle 1260 px of it, so the illustration is scaled to that
width and centered. The rest of the square is a gradient taken from the
illustration's own edge colors, and its edges are feathered into that, so no
seam shows on iPhone or iPad.

Usage: python3 scripts/build-ios-splash.py ios/splash-source.jpg
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
SIZE = 2732
VISIBLE_WIDTH = 1240
FEATHER = 70

source = Image.open(sys.argv[1]).convert("RGB")
height = round(source.height * VISIBLE_WIDTH / source.width)
art = source.resize((VISIBLE_WIDTH, height), Image.LANCZOS)

left = (SIZE - art.width) // 2
top = (SIZE - art.height) // 2

# Each canvas row takes the average color of the art's left and right edges at
# that height, held flat above and below the art: the cream-to-sage wash.
edge = 12
strip = Image.new("RGB", (1, SIZE))
for y in range(SIZE):
    row = min(max(y - top, 0), art.height - 1)
    samples = [art.getpixel((x, row)) for x in (*range(edge), *range(art.width - edge, art.width))]
    strip.putpixel((0, y), tuple(sum(c[i] for c in samples) // len(samples) for i in range(3)))
backdrop = strip.resize((SIZE, SIZE)).filter(ImageFilter.GaussianBlur(24))

mask = Image.new("L", art.size, 0)
ImageDraw.Draw(mask).rectangle(
    (FEATHER, FEATHER, art.width - FEATHER, art.height - FEATHER), fill=255
)
mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 2))

backdrop.paste(art, (left, top), mask)

for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    backdrop.save(OUT / name, optimize=True)
print(f"{SIZE}x{SIZE} splash, art {art.width}x{art.height} at ({left}, {top})")
