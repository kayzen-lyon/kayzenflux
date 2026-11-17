#!/usr/bin/env python3
"""Reconditionne la build officielle yt-dlp_musllinux_aarch64 (onedir PyInstaller)
en un environnement CPython classique utilisable sur Android.

Pourquoi : sur Android, le binaire ne peut être lancé que via le chargeur musl
embarqué ; or le bootloader PyInstaller cherche son archive dans
/proc/self/exe (qui désigne alors le chargeur). On extrait donc les modules
(bytecode non modifié) vers une arborescence PYTHONHOME standard.

Usage : repack_ytdlp_runtime.py <yt-dlp_musllinux_aarch64.zip> <dossier_sortie>
Dépendance de build uniquement : PyInstaller (lecture des archives).
"""
import os
import shutil
import sys
import zipfile
import zlib

from PyInstaller.archive.readers import CArchiveReader, PKG_ITEM_PYZ
from PyInstaller.loader.pyimod01_archive import ZlibArchiveReader, PYZ_ITEM_NSPKG, PYZ_ITEM_PKG

EXE = "yt-dlp_musllinux_aarch64"


def main(src_zip: str, out: str) -> None:
    work = os.path.join(out, "_onedir")
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(work)
    with zipfile.ZipFile(src_zip) as zf:
        zf.extractall(work)
    internal = os.path.join(work, "_internal")
    home = os.path.join(out, "py")
    pylib = os.path.join(home, "lib", "python3.14")
    libdir = os.path.join(home, "lib")
    os.makedirs(pylib)

    # 1) Bibliothèque standard de démarrage.
    with zipfile.ZipFile(os.path.join(internal, "base_library.zip")) as zf:
        zf.extractall(pylib)
        magic = None
        for n in zf.namelist():
            if n.endswith(".pyc"):
                magic = zf.read(n)[:4]
                break
    assert magic, "magic pyc introuvable"

    # 2) Modules de l'archive PYZ (bytecode d'origine, en-tête pyc ajouté).
    pkg = CArchiveReader(os.path.join(work, EXE))
    count = 0
    for name, entry in pkg.toc.items():
        if entry[-1] in ("m", "M") and not name.startswith("pyimod"):
            # Modules d'amorçage stockés hors PYZ (ex. struct).
            parts = name.split(".")
            target = os.path.join(pylib, *parts, "__init__.pyc") if entry[-1] == "M" else os.path.join(pylib, *parts[:-1], parts[-1] + ".pyc")
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as f:
                f.write(magic + b"\0" * 12 + pkg.extract(name))
            count += 1
            continue
        if entry[-1] != PKG_ITEM_PYZ:
            continue
        pyz = pkg.open_embedded_archive(name)
        with open(pyz._filename, "rb") as fp:
            for mod, (typecode, off, length) in pyz.toc.items():
                parts = mod.split(".")
                if typecode == PYZ_ITEM_NSPKG:
                    os.makedirs(os.path.join(pylib, *parts), exist_ok=True)
                    continue
                fp.seek(pyz._start_offset + off)
                code = zlib.decompress(fp.read(length))
                if typecode == PYZ_ITEM_PKG:
                    target = os.path.join(pylib, *parts, "__init__.pyc")
                else:
                    target = os.path.join(pylib, *parts[:-1], parts[-1] + ".pyc")
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, "wb") as f:
                    f.write(magic + b"\0" * 12 + code)
                count += 1

    # 3) Modules natifs, données des paquets et bibliothèques partagées.
    for entry in os.listdir(internal):
        src = os.path.join(internal, entry)
        if entry == "base_library.zip":
            continue
        if entry == "python3.14":
            shutil.copytree(os.path.join(src, "lib-dynload"), os.path.join(pylib, "lib-dynload"))
        elif os.path.isdir(src):
            shutil.copytree(src, os.path.join(pylib, entry), dirs_exist_ok=True)
        elif ".cpython-314-" in entry:
            shutil.copy2(src, pylib)
        elif entry.startswith("lib") and ".so" in entry:
            shutil.copy2(src, libdir)
        else:
            shutil.copy2(src, home)
    shutil.rmtree(work)
    # Point d'entrée (équivalent du __main__ de la build PyInstaller).
    with open(os.path.join(pylib, "kzflux_entry.py"), "w") as f:
        f.write("import sys\nimport yt_dlp\n\nsys.exit(yt_dlp.main())\n")
    print(f"{count} modules extraits vers {home}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
