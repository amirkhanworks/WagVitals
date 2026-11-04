from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image

BRAND = Path("assets/img/brand")
CREAM = (251, 245, 238, 255)


def render_svg(filename: str, width: int, height: int) -> Image.Image:
    data = cairosvg.svg2png(
        url=str(BRAND / filename),
        output_width=width,
        output_height=height,
    )
    return Image.open(BytesIO(data)).convert("RGBA")


# Transparent stacked fallback, rendered from the vector master.
stack = render_svg("logo-stacked.svg", 800, 595)
stack.save(BRAND / "logo-stacked.png", "PNG", optimize=True)

# Mark-only PNG fallbacks for browser tabs.
favicon = render_svg("favicon.svg", 32, 32)
favicon.save(BRAND / "favicon-32.png", "PNG", optimize=True)
favicon.resize((16, 16), Image.Resampling.LANCZOS).save(
    BRAND / "favicon-16.png", "PNG", optimize=True
)

# Apple touch icon: mark centred on cream with 18% horizontal padding.
apple = Image.new("RGBA", (180, 180), CREAM)
mark_width = round(180 * 0.64)
mark_height = round(mark_width * 522 / 557)
mark = render_svg("logo-mark.svg", mark_width, mark_height)
apple.alpha_composite(
    mark,
    ((180 - mark_width) // 2, (180 - mark_height) // 2),
)
apple.convert("RGB").save(BRAND / "apple-touch-icon.png", "PNG", optimize=True)

# Open Graph preview: stacked logo centred on cream at 40% canvas height.
og = Image.new("RGBA", (1200, 630), CREAM)
og_logo = render_svg("logo-stacked.svg", 339, 252)
og.alpha_composite(og_logo, ((1200 - 339) // 2, (630 - 252) // 2))
og.convert("RGB").save(BRAND / "og-image.png", "PNG", optimize=True)
