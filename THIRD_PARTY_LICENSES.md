# Composants tiers

| Composant | Usage | Licence | Distribution |
| --- | --- | --- | --- |
| yt-dlp | Moteur de téléchargement (binaire officiel, non modifié) | Unlicense (domaine public) | Embarqué dans l'application de bureau |
| FFmpeg / FFprobe | Fusion et conversion audio/vidéo | **GPL v3** (builds [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds) sous Linux/Windows, [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) sous macOS) | Embarqué comme **programme séparé**, appelé en ligne de commande. Texte de licence fourni (`FFMPEG-LICENSE.txt`). Code source : https://ffmpeg.org/download.html et dépôts de build ci-contre ; copie disponible sur demande à contact@kayzen-lyon.fr pendant 3 ans. |
| Deno | Moteur JavaScript requis par yt-dlp pour certains sites | MIT | Embarqué |
| Electron | Application de bureau | MIT (Chromium : licences BSD et autres, fichier `LICENSES.chromium.html`) | Embarqué |
| SponsorBlock (API) | Segments sponsorisés | Données sous CC BY-NC-SA 4.0 — **usage commercial à valider** | Appel réseau (application et extension) |
| electron-updater 6 | Mise à jour automatique de l'application de bureau, uniquement avec l'accord de l'utilisateur | MIT. Dépendances intégrées : builder-util-runtime, fs-extra, jsonfile, universalify, js-yaml, lazy-val, lodash.escaperegexp, lodash.isequal, tiny-typed-emitter, debug, ms (MIT) ; semver (ISC) ; graceful-fs, sax (BlueOak-1.0.0) ; argparse (Python-2.0) | Embarqué (intégré au fichier main.cjs) |
| whisper.cpp (`whisper-cli`, ggml) | Transcription locale sans sous-titres (Premium) | MIT — © The ggml authors ([ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)) | **Non embarqué** : binaire officiel non modifié (release `b5454`, Linux x64/arm64, Windows x64/arm64) téléchargé à la demande de l'utilisateur depuis les releases GitHub officielles, vérifié par SHA-256 épinglé, stocké dans le dossier de données de l'application. Pas de binaire officiel macOS : fonction non proposée. |
| Modèles Whisper ggml (`ggml-base.bin`, `ggml-small.bin`) | Modèles de reconnaissance vocale multilingues | MIT (poids [OpenAI Whisper](https://github.com/openai/whisper), conversion ggml par le projet whisper.cpp) | **Non embarqués** : téléchargés à la demande depuis [huggingface.co/ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp), vérifiés par SHA-256 épinglé. |
| Ollama | Résumé local des transcriptions (Premium, facultatif) | MIT | **Non redistribué** : installé séparément par l'utilisateur ; KAYZEN Flux ne dialogue qu'avec un serveur local (127.0.0.1:11434). Les modèles choisis par l'utilisateur dans Ollama relèvent de leurs propres licences. |
| React, React DOM | Interface | MIT | Embarqué |
| lucide-react | Icônes | ISC | Embarqué |
| Tailwind CSS | Styles | MIT | Embarqué (compilé) |
| Outfit, Plus Jakarta Sans (Fontsource) | Polices auto-hébergées | SIL OFL 1.1 | Embarqué |
| zod | Validation | MIT | Embarqué |

NouTube (AGPL-3.0) a servi de référence d'architecture : **aucun code n'en est copié**.
