"""Wrap uploaded card-back artwork in standalone, card-sized SVGs."""
import base64
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BACKS = ROOT / "www" / "img" / "backs"

DESIGNS = {
    "baroque-ink": ("card_back2.webp", None),
    "antique-olive": ("card_back3.webp", (0, 14, 240, 361)),
    "antique-rose": ("card_back3.webp", (260, 14, 500, 361)),
    "astral-gold": ("card_back4.webp", None),
    "navy-filigree": ("card_back5.webp", None),
    "scarlet-scroll": ("classic-playing-card-back-design-17.webp", (8, 8, 244, 333)),
    "sapphire-scroll": ("classic-playing-card-back-design-17.webp", (256, 8, 492, 333)),
}


def main():
    for name, (source_name, crop) in DESIGNS.items():
        with Image.open(BACKS / source_name) as source:
            artwork = source.crop(crop) if crop else source.copy()
            payload = BytesIO()
            artwork.save(payload, format="WEBP", quality=94, method=6)

        encoded = base64.b64encode(payload.getvalue()).decode("ascii")
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" '
            'preserveAspectRatio="none">'
            f'<title>{name.replace("-", " ").title()}</title>'
            f'<image width="100" height="140" href="data:image/webp;base64,{encoded}"/>'
            '</svg>'
        )
        (BACKS / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(f"Created {name}.svg")


if __name__ == "__main__":
    main()
