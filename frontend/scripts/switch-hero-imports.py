"""Point the hero image imports at the WebP versions."""

import os

REPLACEMENTS = {
    "src/components/auth/AuthSplit.jsx": [
        ("auth-hero.jpg", "auth-hero.webp"),
        ("auth-slide-1.jpg", "auth-slide-1.webp"),
        ("auth-slide-2.jpg", "auth-slide-2.webp"),
        ("auth-slide-3.jpg", "auth-slide-3.webp"),
        ("auth-slide-4.jpg", "auth-slide-4.webp"),
    ],
    "src/components/home/Hero.jsx": [
        ("food_5.png", "food_5.webp"),
        ("food_26.png", "food_26.webp"),
    ],
    "src/pages/AboutPage.jsx": [
        ("food_5.png", "food_5.webp"),
        ("food_4.png", "food_4.webp"),
    ],
    "src/pages/ContactPage.jsx": [("food_3.png", "food_3.webp")],
    "src/pages/ServicesPage.jsx": [("food_7.png", "food_7.webp")],
    "src/pages/admin/AdminLoginPage.jsx": [("auth-hero.jpg", "auth-hero.webp")],
}

for path, pairs in REPLACEMENTS.items():
    if not os.path.exists(path):
        print(f"  missing {path}")
        continue

    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read()

    original = content
    for old, new in pairs:
        content = content.replace(old, new)

    if content != original:
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(content)
        print(f"  updated {path}")
    else:
        print(f"  unchanged {path}")

print("\nRemaining raster asset imports:")
for root, _dirs, files in os.walk("src"):
    for name in files:
        if not name.endswith((".jsx", ".js", ".css")):
            continue
        full = os.path.join(root, name)
        with open(full, "r", encoding="utf-8") as handle:
            for number, line in enumerate(handle, 1):
                if "assets/" in line and (".png" in line or ".jpg" in line):
                    print(f"  {full}:{number}: {line.strip()}")
