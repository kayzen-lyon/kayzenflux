#!/usr/bin/env bash
# Construit et signe l'APK sans Gradle (outils Android de Debian/Ubuntu) :
#   sudo apt-get install aapt apksigner zipalign android-sdk-platform-23 dalvik-exchange junit4
# Usage : ./build.sh [test|apk|all]   (défaut : all)
# Signature : KZ_KEYSTORE / KZ_KEYSTORE_PASS / KZ_KEY_ALIAS ; à défaut, une clé locale
# est générée HORS du dépôt (~/.config/kayzen-flux/android-local.jks).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
MODE="${1:-all}"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
JUNIT_CP="/usr/share/java/junit4.jar:/usr/share/java/hamcrest-core.jar"
B="$HERE/app/build"
SRC="$HERE/app/src"
VERSION="$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$SRC/main/AndroidManifest.xml")"

run_tests() {
  rm -rf "$B/test-classes" && mkdir -p "$B/test-classes" "$B/test-results"
  javac -nowarn --release 8 -encoding UTF-8 -d "$B/test-classes" -cp "$JUNIT_CP" \
    "$SRC"/main/java/fr/kayzen/flux/core/*.java $(find "$SRC/test/java" -name '*.java') 2>&1 | grep -v "JAVA_TOOL_OPTIONS\|bootstrap\|warning" || true
  java -cp "$B/test-classes:$JUNIT_CP" org.junit.runner.JUnitCore fr.kayzen.flux.core.CoreTest 2>&1 \
    | grep -v JAVA_TOOL_OPTIONS | tee "$B/test-results/CoreTest.txt"
  grep -q '^OK (' "$B/test-results/CoreTest.txt"
}

build_apk() {
  [ -f runtime/runtime.zip ] || { echo "runtime/ absent : lancez d'abord scripts/build-native.sh" >&2; exit 1; }
  rm -rf "$B/gen" "$B/classes" "$B/apk" && mkdir -p "$B/gen" "$B/classes" "$B/apk/assets/licenses" "$B/outputs/apk/release"
  # Ressources et R.java
  aapt package -f -m -J "$B/gen" -M "$SRC/main/AndroidManifest.xml" -S "$SRC/main/res" -I "$ANDROID_JAR"
  # Java 8 → dex (API min. 26 : lambdas natives)
  javac -nowarn --release 8 -encoding UTF-8 -d "$B/classes" -cp "$ANDROID_JAR" \
    $(find "$SRC/main/java" "$B/gen" -name '*.java') 2>&1 | grep -v "JAVA_TOOL_OPTIONS\|bootstrap\|warning" || true
  dalvik-exchange --dex --min-sdk-version=26 --output="$B/apk/classes.dex" "$B/classes"
  # Assets : licences + environnement Python (stocké sans recompression)
  cp -r "$SRC/main/assets/." "$B/apk/assets/"
  cp runtime/runtime.zip "$B/apk/assets/runtime.zip"
  cp runtime/YTDLP-THIRD_PARTY_LICENSES.txt "$B/apk/assets/licenses/"
  mkdir -p "$B/apk/lib/arm64-v8a" && cp runtime/lib/arm64-v8a/*.so "$B/apk/lib/arm64-v8a/"
  aapt package -f -0 zip -M "$SRC/main/AndroidManifest.xml" -S "$SRC/main/res" -A "$B/apk/assets" \
    -I "$ANDROID_JAR" -F "$B/unsigned.apk"
  (cd "$B/apk" && aapt add "$B/unsigned.apk" classes.dex lib/arm64-v8a/*.so >/dev/null)
  zipalign -f -p 4 "$B/unsigned.apk" "$B/aligned.apk"
  # Signature
  local ks="${KZ_KEYSTORE:-$HOME/.config/kayzen-flux/android-local.jks}"
  local alias="${KZ_KEY_ALIAS:-kayzen-local}"
  local pass="${KZ_KEYSTORE_PASS:-}"
  if [ -z "$pass" ]; then
    mkdir -p "$(dirname "$ks")"; chmod 700 "$(dirname "$ks")"
    local pf="$(dirname "$ks")/android-local.pass"
    [ -f "$pf" ] || (umask 077; head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$pf")
    pass="$(cat "$pf")"
    [ -f "$ks" ] || keytool -genkeypair -keystore "$ks" -storetype PKCS12 -alias "$alias" -keyalg RSA -keysize 3072 \
      -validity 10000 -storepass "$pass" -keypass "$pass" -dname "CN=KAYZEN Flux (cle locale de test), O=KAYZEN, L=Lyon, C=FR" 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
  fi
  local out="$B/outputs/apk/release/kayzen-flux-$VERSION-android.apk"
  KZ_PASS="$pass" apksigner sign --ks "$ks" --ks-key-alias "$alias" --ks-pass env:KZ_PASS --key-pass env:KZ_PASS \
    --out "$out" "$B/aligned.apk"
  apksigner verify --print-certs "$out" | grep -v JAVA_TOOL_OPTIONS | head -3
  ls -la "$out"
}

case "$MODE" in
  test) run_tests ;;
  apk) build_apk ;;
  all) run_tests && build_apk ;;
  *) echo "Usage : $0 [test|apk|all]" >&2; exit 2 ;;
esac
