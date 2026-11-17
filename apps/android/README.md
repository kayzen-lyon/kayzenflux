# KAYZEN Flux — Android

Application Android native (Java, vues Android, API 26+, **arm64-v8a uniquement**) :
téléchargement et conversion audio/vidéo **sur le téléphone** (yt-dlp + FFmpeg embarqués),
sans aucun serveur KAYZEN. Distribution directe (APK), pas de Play Store.
Licence du code : MIT (`LICENSE`) ; FFmpeg embarqué : GPL v3 (voir `THIRD_PARTY_LICENSES.md`).

## Fonctions
- Champ de lien, bouton Coller, partage depuis d'autres apps (`ACTION_SEND text/plain`).
- Analyse : titre, durée, auteur, miniature ; **refus des contenus DRM**.
- Préréglages (tous gratuits) : MP3 192 kbps, M4A, Opus, FLAC (conteneur), MP4 720p, MP4 1080p, meilleure qualité.
- Progression, annulation, enregistrement dans `Téléchargements/KAYZEN Flux` (MediaStore, Android 10+).
- Liste des fichiers récupérés, mise à jour de yt-dlp en un bouton (GitHub officiel, SHA-256 vérifié).
- Écran « À propos » (version, licence, lien source), mode sombre automatique.

## Architecture du moteur
- `libkzmusl.so` : chargeur dynamique musl (aarch64) ; seul fichier exécuté, depuis le dossier
  des bibliothèques natives de l'APK (contrainte W^X d'Android).
- `assets/runtime.zip` : CPython 3.14 + yt-dlp de la build officielle `yt-dlp_musllinux_aarch64`,
  réorganisée en `PYTHONHOME` classique par `scripts/repack_ytdlp_runtime.py` (bytecode inchangé),
  plus le lanceur `native/kzpy.c`. Décompressé au premier lancement (~110 Mo).
- `libkzffmpeg.so`/`libkzffprobe.so` : FFmpeg 6.1.1 statique (GPL v3, LAME), sans réseau.
- `LocalProxy` : relais HTTP sur 127.0.0.1 protégé par jeton, qui résout les noms via Android
  (musl ne peut pas lire la config DNS d'Android). Le TLS reste de bout en bout.

## Construire
Pourquoi pas Gradle : dans l'environnement de création, Google Maven, Maven Central et
dl.google.com étaient bloqués (403) ; le build utilise donc les outils Android d'Ubuntu.
```bash
sudo apt-get install aapt apksigner zipalign android-sdk-platform-23 dalvik-exchange junit4 \
     gcc-aarch64-linux-gnu dpkg-dev zip
pip install pyinstaller==6.16.0            # lecture des archives PyInstaller (build uniquement)
./scripts/build-native.sh                  # musl, LAME, FFmpeg, yt-dlp → runtime/ (ignoré par git)
./build.sh                                 # tests JUnit + APK signé
# → app/build/outputs/apk/release/kayzen-flux-1.0.0-android.apk
```

## Signer avec une vraie clé
Par défaut, `build.sh` génère une clé **locale de test** hors du dépôt
(`~/.config/kayzen-flux/android-local.jks`). Pour une publication :
```bash
keytool -genkeypair -keystore ~/cles/kayzen-flux.jks -storetype PKCS12 -alias kayzen -keyalg RSA -keysize 4096 -validity 10000
KZ_KEYSTORE=~/cles/kayzen-flux.jks KZ_KEY_ALIAS=kayzen KZ_KEYSTORE_PASS='…' ./build.sh apk
```
Conservez la clé en lieu sûr : les mises à jour devront être signées avec la même clé.
Ne jamais versionner de keystore ni de mot de passe (`.gitignore`).
Changement de clé = désinstaller la version signée avec la clé de test.

## Limites connues
- arm64-v8a uniquement ; non testé sur appareil réel ni émulateur (voir rapport).
- Téléchargement lié à l'écran ouvert (pas de service de premier plan) ; écran maintenu allumé.
- Pas de moteur JavaScript (Deno) : certains sites (dont les plus gros hébergeurs vidéo)
  peuvent proposer moins de formats ou échouer.
- Opus : sans réencodage uniquement si la source est déjà en Opus (pas de libopus).
