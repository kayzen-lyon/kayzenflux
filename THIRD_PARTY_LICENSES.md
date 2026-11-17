# Composants tiers

KAYZEN Flux est un logiciel libre et gratuit, distribué sous **licence MIT** (fichier [`LICENSE`](LICENSE), © 2026 Tarek Belhadj (KAYZEN)). Les composants ci-dessous restent soumis à leurs propres licences.

| Composant | Usage | Licence | Distribution |
| --- | --- | --- | --- |
| yt-dlp | Moteur de téléchargement (binaire officiel, non modifié) | Unlicense (domaine public) | Embarqué dans l'application de bureau |
| FFmpeg / FFprobe | Fusion et conversion audio/vidéo | **GPL v3** (builds [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds) sous Linux/Windows, [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) sous macOS) | Embarqué comme **programme séparé**, appelé en ligne de commande. Texte de licence fourni (`FFMPEG-LICENSE.txt`). Code source : https://ffmpeg.org/download.html et dépôts de build ci-contre ; copie disponible sur demande à contact@kayzen-lyon.fr pendant 3 ans. |
| Deno | Moteur JavaScript requis par yt-dlp pour certains sites | MIT | Embarqué |
| Electron | Application de bureau | MIT (Chromium : licences BSD et autres, fichier `LICENSES.chromium.html`) | Embarqué |
| SponsorBlock (API) | Segments sponsorisés | Données sous [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — usage **non commercial** (application gratuite, sans publicité ni offre payante) | Appel réseau (application et extension), données non modifiées et non redistribuées. Attribution ci-dessous et dans la fenêtre de l'extension. |
| electron-updater 6 | Mise à jour automatique de l'application de bureau, uniquement avec l'accord de l'utilisateur | MIT. Dépendances intégrées : builder-util-runtime, fs-extra, jsonfile, universalify, js-yaml, lazy-val, lodash.escaperegexp, lodash.isequal, tiny-typed-emitter, debug, ms (MIT) ; semver (ISC) ; graceful-fs, sax (BlueOak-1.0.0) ; argparse (Python-2.0) | Embarqué (intégré au fichier main.cjs) |
| whisper.cpp (`whisper-cli`, ggml) | Transcription locale sans sous-titres | MIT — © The ggml authors ([ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)) | **Non embarqué** : binaire officiel non modifié (release `b5454`, Linux x64/arm64, Windows x64/arm64) téléchargé à la demande de l'utilisateur depuis les releases GitHub officielles, vérifié par SHA-256 épinglé, stocké dans le dossier de données de l'application. Pas de binaire officiel macOS : fonction non proposée. |
| Modèles Whisper ggml (`ggml-base.bin`, `ggml-small.bin`) | Modèles de reconnaissance vocale multilingues | MIT (poids [OpenAI Whisper](https://github.com/openai/whisper), conversion ggml par le projet whisper.cpp) | **Non embarqués** : téléchargés à la demande depuis [huggingface.co/ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp), vérifiés par SHA-256 épinglé. |
| Ollama | Résumé local des transcriptions (facultatif) | MIT | **Non redistribué** : installé séparément par l'utilisateur ; KAYZEN Flux ne dialogue qu'avec un serveur local (127.0.0.1:11434). Les modèles choisis par l'utilisateur dans Ollama relèvent de leurs propres licences. |
| React, React DOM | Interface | MIT | Embarqué |
| lucide-react | Icônes | ISC | Embarqué |
| Tailwind CSS | Styles | MIT | Embarqué (compilé) |
| Outfit, Plus Jakarta Sans (Fontsource) | Polices auto-hébergées | SIL OFL 1.1 | Embarqué |
| zod | Validation | MIT | Embarqué |

## Attribution SponsorBlock

Les segments sponsorisés proviennent de [SponsorBlock](https://sponsor.ajay.app) (Ajay Ramachandran et contributeurs), base communautaire publiée sous licence [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/). KAYZEN Flux interroge l'API publique à la demande, n'en modifie pas les données et ne les redistribue pas. Ces données ne peuvent pas être utilisées à des fins commerciales : toute réintroduction d'une offre payante ou de publicité imposerait de réexaminer cet usage.

NouTube (AGPL-3.0) a servi de référence d'architecture : **aucun code n'en est copié**.
