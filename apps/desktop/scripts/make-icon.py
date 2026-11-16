"""Génère l'icône d'application (1024 px) aux couleurs KAYZEN."""
import sys
from PIL import Image, ImageDraw

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([40, 40, S - 40, S - 40], radius=230, fill=(183, 72, 31, 255))
d.rounded_rectangle([300, 270, 400, 754], radius=28, fill=(255, 255, 255, 255))
d.polygon([(450, 512), (740, 270), (740, 754)], fill=(255, 255, 255, 255))
d.ellipse([700, 700, 860, 860], fill=(243, 189, 73, 255))
img.save(sys.argv[1] if len(sys.argv) > 1 else 'icon.png')
