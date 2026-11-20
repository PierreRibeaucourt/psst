"""
Génère les logos Psst (brand/*.svg) : la bulle-cadeau + le mot « psst » en Nunito Black,
converti en tracés (aucune police requise pour afficher le logo).

    python -I scripts/make-brand.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "brand"
NAVY, ORANGE, WHITE = "#1B2738", "#FF9F1C", "#FFFFFF"

font = instantiateVariableFont(TTFont(BRAND / "fonts" / "Nunito-VariableFont_wght.ttf"), {"wght": 900})
font.save(BRAND / "fonts" / "Nunito-Black.ttf")
gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
upem = font["head"].unitsPerEm
x_height = font["OS/2"].sxHeight


def word_paths(text: str, tracking: float = -0.01):
    """Chemins SVG (unités de la police, axe y vers le haut) et largeur totale."""
    x, parts = 0.0, []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(pen)
        parts.append((x, pen.getCommands()))
        x += hmtx[name][0] + tracking * upem
    return parts, x - tracking * upem


def mark(bubble: str, ribbon: str) -> str:
    src = (BRAND / "mark.svg").read_text(encoding="utf-8")
    body = src[src.index(">", src.index("<svg")) + 1 : src.rindex("</svg>")]
    return body.replace("#1B2738", bubble).replace("#FF9F1C", ribbon)


def wordmark_group(color: str, size: float, x0: float, baseline: float) -> tuple[str, float]:
    parts, width = word_paths("psst")
    s = size / upem
    paths = "".join(
        f'<path transform="translate({x0 + px * s:.2f} {baseline}) scale({s:.5f} {-s:.5f})" d="{d}"/>'
        for px, d in parts
    )
    return f'<g fill="{color}">{paths}</g>', width * s


def svg(w: float, h: float, inner: str, label="Psst") -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'role="img" aria-label="{label}">{inner}</svg>\n')


# Logo horizontal : bulle 128 + mot. x-height du mot ≈ 60 unités, centrée sur le corps de la bulle (38→110).
size = 60 / (x_height / upem)
baseline = 74 + 30
for variant, bubble, ribbon, text in [
    ("logo", NAVY, ORANGE, NAVY),
    ("logo-reverse", WHITE, ORANGE, WHITE),
]:
    word, ww = wordmark_group(text, size, 150, baseline)
    width = 150 + ww + 6
    (BRAND / f"{variant}.svg").write_text(svg(width, 136, f"<g>{mark(bubble, ribbon)}</g>{word}"), encoding="utf-8")

(BRAND / "mark-reverse.svg").write_text(svg(128, 128, mark(WHITE, ORANGE)), encoding="utf-8")
word, ww = wordmark_group(NAVY, 100, 0, 76)
(BRAND / "wordmark.svg").write_text(svg(ww + 4, 100, word), encoding="utf-8")
print("logos écrits dans", BRAND)
