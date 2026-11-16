# Composants tiers

| Composant | Usage | Licence | Distribution |
| --- | --- | --- | --- |
| yt-dlp | Moteur de téléchargement (binaire officiel, non modifié) | Unlicense (domaine public) | Embarqué dans l'application de bureau |
| FFmpeg / FFprobe | Fusion et conversion audio/vidéo | **GPL v3** (builds [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds) sous Linux/Windows, [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) sous macOS) | Embarqué comme **programme séparé**, appelé en ligne de commande. Texte de licence fourni (`FFMPEG-LICENSE.txt`). Code source : https://ffmpeg.org/download.html et dépôts de build ci-contre ; copie disponible sur demande à contact@kayzen-lyon.fr pendant 3 ans. |
| Deno | Moteur JavaScript requis par yt-dlp pour certains sites | MIT | Embarqué |
| Electron | Application de bureau | MIT (Chromium : licences BSD et autres, fichier `LICENSES.chromium.html`) | Embarqué |
| SponsorBlock (API) | Segments sponsorisés | Données sous CC BY-NC-SA 4.0 — **usage commercial à valider** | Appel réseau (application et extension) |
| React, React DOM | Interface | MIT | Embarqué |
| lucide-react | Icônes | ISC | Embarqué |
| Tailwind CSS | Styles | MIT | Embarqué (compilé) |
| Outfit, Plus Jakarta Sans (Fontsource) | Polices auto-hébergées | SIL OFL 1.1 | Embarqué |
| zod | Validation | MIT | Embarqué |

NouTube (AGPL-3.0) a servi de référence d'architecture : **aucun code n'en est copié**.
