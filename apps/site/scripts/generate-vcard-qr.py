#!/usr/bin/env python3
"""Génère la carte de visite KAYZEN (vCard 3.0) et son QR code SVG statique.

Sorties : public/kayzen-lyon.vcf et public/assets/qr-vcard.svg.
Usage : pip install qrcode  puis  python3 scripts/generate-vcard-qr.py
(ou `pnpm --filter ./apps/site qr`). Aucun service en ligne n'est appelé :
le QR code est calculé localement et servi comme fichier (CSP img-src 'self').
"""
import re
from pathlib import Path

import qrcode
import qrcode.image.svg

ROOT = Path(__file__).resolve().parent.parent / "public"

VCARD = "\r\n".join([
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:BELHADJ;Tarek;;;",
    "FN:KAYZEN — Tarek BELHADJ",
    "ORG:KAYZEN",
    "TITLE:Création de sites internet et de logiciels",
    "TEL;TYPE=WORK,VOICE:+33487776861",
    "EMAIL;TYPE=WORK:contact@kayzen-lyon.fr",
    "URL:https://www.kayzen-lyon.com",
    "ADR;TYPE=WORK:;;6 rue Pierre Termier;Lyon;;69009;France",
    "END:VCARD",
]) + "\r\n"


def main() -> None:
    (ROOT / "kayzen-lyon.vcf").write_text(VCARD, encoding="utf-8", newline="")
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2)
    qr.add_data(VCARD.encode("utf-8"))
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathFillImage)
    svg = img.to_string(encoding="unicode")
    # Dimensions en pixels (et non en mm). Les modules sont déjà noirs sur fond
    # blanc (fill="#000000") : le QR reste lisible au scan quel que soit le thème.
    svg = re.sub(r'width="[\d.]+mm" height="[\d.]+mm"', 'width="292" height="292"', svg, count=1)
    (ROOT / "assets" / "qr-vcard.svg").write_text(svg, encoding="utf-8")
    print(f"QR version {qr.version}, {len(VCARD.encode('utf-8'))} octets encodés")


if __name__ == "__main__":
    main()
