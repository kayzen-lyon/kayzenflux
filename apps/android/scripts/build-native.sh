#!/usr/bin/env bash
# Prépare les composants natifs embarqués dans l'APK (Linux x86_64, Ubuntu 24.04).
#  - musl 1.2.4 (chargeur dynamique aarch64) et LAME 3.100, FFmpeg 6.1.1 statiques,
#    compilés depuis les paquets source Ubuntu ;
#  - build officielle yt-dlp_musllinux_aarch64 (vérifiée par SHA-256), reconditionnée.
# Prérequis : sudo apt-get install gcc-aarch64-linux-gnu dpkg-dev ; pip install pyinstaller==6.16.0
# (deb-src activé dans /etc/apt/sources.list.d/ubuntu.sources).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/runtime"            # ignoré par git
W="${KZ_NATIVE_WORK:-/tmp/kzflux-native}"
mkdir -p "$W/src" "$OUT"
cd "$W/src"
[ -f ffmpeg_6.1.1.orig.tar.xz ] || apt-get source -q --download-only musl lame ffmpeg
P="$W/prefix"; mkdir -p "$P"
cd "$W"
if [ ! -f "$W/musl-out/lib/libc.so" ]; then
  tar xzf src/musl_1.2.4.orig.tar.gz && cd musl-1.2.4
  ./configure --target=aarch64-linux-gnu CROSS_COMPILE=aarch64-linux-gnu- --prefix="$W/musl-out" >/dev/null
  make -j"$(nproc)" >/dev/null && make install >/dev/null && cd "$W"
fi
if [ ! -f "$P/lib/libmp3lame.a" ]; then
  tar xzf src/lame_3.100.orig.tar.gz && cd lame-3.100
  ./configure --host=aarch64-linux-gnu --prefix="$P" --enable-static --disable-shared --disable-frontend --disable-decoder >/dev/null
  make -j"$(nproc)" >/dev/null && make install >/dev/null && cd "$W"
fi
if [ ! -f "$W/ff-out/bin/ffmpeg" ]; then
  tar xJf src/ffmpeg_6.1.1.orig.tar.xz && cd ffmpeg-6.1.1
  ./configure --enable-cross-compile --arch=aarch64 --target-os=linux --cross-prefix=aarch64-linux-gnu- \
    --prefix="$W/ff-out" --pkg-config=false --enable-static --disable-shared \
    --extra-ldflags="-static -L$P/lib" --extra-cflags="-I$P/include" \
    --enable-gpl --enable-version3 --enable-libmp3lame --disable-doc --disable-ffplay --disable-network \
    --disable-autodetect --disable-debug --enable-small --disable-devices --disable-filters \
    --enable-filter=aresample,aformat,anull,null,scale,format,copy,atrim,trim,concat,setpts,asetpts,volume \
    --disable-encoders --enable-encoder=libmp3lame,aac,flac,opus,pcm_s16le,mjpeg,copy --disable-hwaccels >/dev/null
  make -j"$(nproc)" >/dev/null && make install >/dev/null && cd "$W"
fi
# yt-dlp officiel (Unlicense), vérifié
cd "$W"
curl -sSfL -o SHA2-256SUMS https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS
curl -sSfL -o yt-dlp_musllinux_aarch64.zip https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_musllinux_aarch64.zip
grep ' yt-dlp_musllinux_aarch64.zip$' SHA2-256SUMS | sha256sum -c -
python3 "$HERE/scripts/repack_ytdlp_runtime.py" yt-dlp_musllinux_aarch64.zip "$W/rt"
aarch64-linux-gnu-gcc -O2 -s -specs "$W/musl-out/lib/musl-gcc.specs" -Wl,--export-dynamic \
  -o "$W/rt/kzpy" "$HERE/native/kzpy.c" -L"$W/rt/py/lib" -l:libpython3.14.so.1.0 -Wl,--allow-shlib-undefined
rm -f "$OUT/runtime.zip"
(cd "$W/rt" && zip -qr -9 "$OUT/runtime.zip" py kzpy)
mkdir -p "$OUT/lib/arm64-v8a"
cp "$W/musl-out/lib/libc.so" "$OUT/lib/arm64-v8a/libkzmusl.so"
aarch64-linux-gnu-strip "$W/ff-out/bin/ffmpeg" -o "$OUT/lib/arm64-v8a/libkzffmpeg.so"
aarch64-linux-gnu-strip "$W/ff-out/bin/ffprobe" -o "$OUT/lib/arm64-v8a/libkzffprobe.so"
cp "$W/rt/py/THIRD_PARTY_LICENSES.txt" "$OUT/YTDLP-THIRD_PARTY_LICENSES.txt"
echo "Composants natifs prêts dans $OUT"
