"""Génère les icônes KAYZEN Flux à partir du symbole « Flux » détouré.

Visuel : symbole (F en flèche, dégradé marine → orange) centré sur un carré
arrondi crème #F6F0E6, marges d'environ 12 %.

Usage :
    python3 scripts/make-icon.py <mark.png> [racine-du-dépôt]

Produit :
- apps/desktop/build/icon.png (1024 px ; electron-builder en dérive .ico et .icns)
- apps/ui/public/icon.png (1024 px)
- apps/extension/static/icons/icon-{16,32,48,128}.png
- apps/android/app/src/main/res/mipmap-*/ic_launcher.png

Chaque taille est rendue directement depuis le symbole source (et non par
réduction de l'icône 1024 px) ; les petites tailles ont des marges réduites et
un léger renforcement de netteté pour rester lisibles.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

CREAM = (246, 240, 230, 255)  # #F6F0E6
SS = 4  # suréchantillonnage pour les bords arrondis


def render(mark: Image.Image, size: int, inset: float, margin: float) -> Image.Image:
    """Carré arrondi crème de `size` px, décalé de `inset` (fraction), symbole avec `margin` (fraction du carré)."""
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    off = round(big * inset)
    side = big - 2 * off
    d.rounded_rectangle([off, off, off + side - 1, off + side - 1], radius=round(side * 0.225), fill=CREAM)
    img = img.resize((size, size), Image.LANCZOS)

    sq_off = size * inset
    sq = size - 2 * sq_off
    avail = sq * (1 - 2 * margin)
    scale = min(avail / mark.width, avail / mark.height)
    w, h = max(1, round(mark.width * scale)), max(1, round(mark.height * scale))
    m = mark.resize((w, h), Image.LANCZOS)
    if size <= 48:
        m = m.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=0))
    x = round((size - w) / 2)
    y = round((size - h) / 2)
    img.alpha_composite(m, (x, y))
    return img


def main() -> None:
    src = Path(sys.argv[1])
    root = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[3]
    mark = Image.open(src).convert('RGBA')
    mark = mark.crop(mark.getbbox())

    out: dict[str, tuple[int, float, float]] = {
        'apps/desktop/build/icon.png': (1024, 0.04, 0.12),
        'apps/ui/public/icon.png': (1024, 0.04, 0.12),
        'apps/extension/static/icons/icon-128.png': (128, 0.0, 0.12),
        'apps/extension/static/icons/icon-48.png': (48, 0.0, 0.10),
        'apps/extension/static/icons/icon-32.png': (32, 0.0, 0.07),
        'apps/extension/static/icons/icon-16.png': (16, 0.0, 0.04),
    }
    for density, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
        out[f'apps/android/app/src/main/res/mipmap-{density}/ic_launcher.png'] = (px, 0.04, 0.12)

    for rel, (size, inset, margin) in out.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        render(mark, size, inset, margin).save(path, optimize=True)
        print(f'{rel} ({size}×{size})')


if __name__ == '__main__':
    main()
