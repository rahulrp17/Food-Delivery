"""Convert the live frontend hero images to WebP.

The source photos are only 360x280 px but weigh ~200 KB each as PNG, and they
are stretched across a full-bleed hero. WebP plus a modest LANCZOS upscale
gives a much smaller file that the browser scales smoothly instead of
hard-stretching a heavy PNG.

The upscales are deliberately modest: the source only holds 360 px of real
detail, so scaling it further costs bytes without adding any perceived
sharpness.

Run from `frontend/`:
    python scripts/optimise-hero-images.py
"""

import os
from PIL import Image

ASSETS = os.path.join("src", "assets")
OUTPUT = os.path.join("src", "assets")

# name -> max width (the source is 360 px wide, so these are upscales)
TARGETS = {
    "food_3.png": 1200,
    "food_4.png": 1200,
    "food_5.png": 1200,
    "food_7.png": 1200,
    "food_26.png": 720,
    "auth-hero.jpg": 1534,
    "auth-slide-1.jpg": 360,
    "auth-slide-2.jpg": 360,
    "auth-slide-3.jpg": 360,
    "auth-slide-4.jpg": 360,
}

QUALITY = 78


def main():
    before = 0
    after = 0

    for name, max_width in TARGETS.items():
        source = os.path.join(ASSETS, name)
        if not os.path.exists(source):
            print(f"  skip {name} (missing)")
            continue

        target = os.path.join(OUTPUT, os.path.splitext(name)[0] + ".webp")
        if os.path.exists(target):
            print(f"  skip {name} (already converted)")
            continue

        image = Image.open(source).convert("RGB")

        if image.width < max_width:
            ratio = max_width / image.width
            image = image.resize(
                (max_width, round(image.height * ratio)), Image.LANCZOS
            )

        image.save(target, "WEBP", quality=QUALITY, method=6)

        before += os.path.getsize(source)
        after += os.path.getsize(target)
        print(
            f"  {name:20} {os.path.getsize(source)//1024:>4} KB -> "
            f"{os.path.getsize(target)//1024:>4} KB  "
            f"({image.size[0]}x{image.size[1]})"
        )

    if before:
        print(f"\nTotal {before//1024} KB -> {after//1024} KB "
              f"({100 - (after * 100) // before}% smaller)")


if __name__ == "__main__":
    main()
