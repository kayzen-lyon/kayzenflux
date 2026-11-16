# Composants tiers

| Composant | Usage | Licence | Embarqué ? |
| --- | --- | --- | --- |
| yt-dlp | Moteur de téléchargement (binaire externe, non modifié) | Unlicense | Non (installé par l'utilisateur) en 0.1 ; sidecar prévu |
| yt-dlp-ejs + Deno | Composants JavaScript requis par yt-dlp pour certains sites | Unlicense / MIT | Non |
| FFmpeg / FFprobe | Fusion et conversion | LGPL 2.1+ ou GPL selon le build — **n'embarquer qu'un build LGPL** | Non en 0.1 |
| SponsorBlock (API via yt-dlp) | Segments sponsorisés | Données CC BY-NC-SA 4.0 | Non (appel réseau par yt-dlp) |
| React, React DOM | Interface | MIT | Oui |
| lucide-react | Icônes | ISC | Oui |
| Tailwind CSS | Styles | MIT | Oui (compilé) |
| @fontsource-variable/outfit, plus-jakarta-sans | Polices auto-hébergées | SIL OFL 1.1 | Oui |
| zod | Validation | MIT | Oui |

NouTube (AGPL-3.0) a servi de référence d'architecture : **aucun code n'en est copié**.
