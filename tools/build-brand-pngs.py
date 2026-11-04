from io import BytesIO
from pathlib import Path
import cairosvg
from PIL import Image

BRAND = Path("assets/img/brand")
CREAM = (251, 245, 238, 255)

def render(name, width, height):
    data = cairosvg.svg2png(url=str(BRAND / name), output_width=width, output_height=height)
    return Image.open(BytesIO(data)).convert("RGBA")

# Transparent stacked fallback from the final vector master.
render("logo-stacked.svg", 800, 596).save(BRAND / "logo-stacked.png", "PNG", optimize=True)
render("logo-stacked.svg", 1600, 1192).save(BRAND / "logo-stacked@2x.png", "PNG", optimize=True)
render("logo-stacked.svg", 2400, 1788).save(BRAND / "logo-stacked@3x.png", "PNG", optimize=True)

# SVG favicon raster fallbacks.
render("favicon.svg", 32, 32).save(BRAND / "favicon-32.png", "PNG", optimize=True)
render("favicon.svg", 16, 16).save(BRAND / "favicon-16.png", "PNG", optimize=True)

# Apple icon: cream tile, mark centred with 18% horizontal padding.
apple = Image.new("RGBA", (180, 180), CREAM)
mark_w = round(180 * 0.64)
mark_h = round(mark_w * 455 / 482)
mark = render("logo-mark.svg", mark_w, mark_h)
apple.alpha_composite(mark, ((180 - mark_w) // 2, (180 - mark_h) // 2))
apple.convert("RGB").save(BRAND / "apple-touch-icon.png", "PNG", optimize=True)

# Open Graph image: stacked logo centred at 40% canvas height.
og = Image.new("RGBA", (1200, 630), CREAM)
logo = render("logo-stacked.svg", 339, 252)
og.alpha_composite(logo, ((1200 - 339) // 2, (630 - 252) // 2))
og.convert("RGB").save(BRAND / "og-image.png", "PNG", optimize=True)
