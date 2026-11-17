# KAYZEN Flux 1.0

Téléchargeur et convertisseur multimédia **local-first**, **gratuit et open source** (licence MIT),
sans publicité ni pistage, propulsé par [yt-dlp](https://github.com/yt-dlp/yt-dlp).
Application de bureau (Windows, macOS, Linux), extension navigateur de lecture sans pub et site vitrine.

Dépôt : https://github.com/kayzen-lyon/kayzenflux · Installeurs : https://telechargements.kayzen-lyon.com/

> Usage personnel, pour des contenus que l'utilisateur a le droit de copier. Les contenus protégés par DRM sont refusés.
> **Avant publication : suivre [`docs/MISE-EN-PRODUCTION.md`](docs/MISE-EN-PRODUCTION.md).**

## Contenu du dépôt

| Dossier | Rôle | Tests |
| --- | --- | --- |
| `packages/core` | Logique pure : URL, formats, arguments yt-dlp, progression, DRM, erreurs, transcription, flux | couverture ≥ 80 % exigée |
| `apps/daemon` | Moteur local (127.0.0.1) : file de tâches, temps réel, bibliothèque, abonnements, transcription | dont téléchargements réels |
| `apps/ui` | Interface React + Tailwind (maquette Stitch Kayzen, clair/sombre) | — (vérifiée par captures) |
| `apps/desktop` | Application Electron : moteur intégré, binaires embarqués vérifiés, lien `kayzenflux://` | oui |
| `apps/extension` | Extension MV3 Chrome/Edge/Firefox : lecture sans pub, SponsorBlock, « Envoyer vers » | oui + test dans Chrome |
| `apps/site` | Site vitrine statique + pages légales (aucune fonction serveur) | pages légales |

## Fonctions

Tout est gratuit, sans compte ni clé de licence :
MP3, M4A, Opus, FLAC (conteneur : n'ajoute aucune qualité à la source), MP4 jusqu'en 4K · SponsorBlock ·
titre/artiste/pochette · sous-titres · playlists jusqu'à 5 000 éléments · jusqu'à 6 téléchargements en parallèle ·
abonnements à des chaînes, playlists ou podcasts (téléchargement automatique des nouveautés) ·
un fichier par chapitre · volume normalisé (EBU R128) · transcription Markdown horodatée (sous-titres ou
reconnaissance vocale locale whisper.cpp) · résumé local via Ollama · bibliothèque, recherche, favoris, export ·
lecteur audio/vidéo hors connexion · modèles de nom de fichier · raccourcis clavier · mode sombre.

**Extension** : blocage des publicités (requêtes, emplacements, données du lecteur, filet de sécurité),
saut des segments sponsorisés (requête anonymisée par préfixe de hachage), masquage des Shorts,
bouton et menu contextuel « Envoyer vers KAYZEN Flux ». Aucune collecte de données, aucun téléchargement.

## Construire

Prérequis : Node.js 22+, pnpm 10, et pour les tests de bout en bout `yt-dlp` + `ffmpeg` dans le PATH.

```bash
pnpm install
pnpm test                      # tous les tests
pnpm typecheck
pnpm build                     # core, démon, interface, application, extension

pnpm start                     # version navigateur : http://127.0.0.1:49152
pnpm --filter @kayzen-flux/desktop start        # application de bureau (dev)
pnpm --filter @kayzen-flux/extension build      # extension → apps/extension/dist/{chromium,firefox}
pnpm --filter @kayzen-flux/desktop dist:linux   # AppImage + .deb (dist:win, dist:mac sur leur système)
```

Les installeurs officiels sont fabriqués par GitHub Actions (`.github/workflows/release.yml`).

## Contribuer

Les contributions sont bienvenues (rapports de bogue, corrections, traductions).

1. Ouvrez d'abord un ticket pour discuter d'un changement important.
2. Créez une branche, ajoutez des tests pour tout changement (tout correctif de bogue ajoute un test), puis
   vérifiez : `pnpm typecheck && pnpm test && pnpm build`.
3. Conventions : TypeScript strict, pas de `any` hors tests, messages utilisateur en français, code et identifiants en anglais.
4. Règles du projet à respecter (détail dans `CLAUDE.md`) : traitement uniquement local, **aucun contournement de DRM**,
   aucune utilisation de cookies ou d'identifiants pour accéder à un contenu payant, aucune télémétrie sans consentement,
   aucune marque tierce dans le nom ou les visuels, licences des composants tiers respectées (`THIRD_PARTY_LICENSES.md`).
5. Ouvrez une demande de fusion (pull request) en décrivant le changement et les vérifications effectuées.
   En contribuant, vous acceptez que votre code soit publié sous licence MIT.

## Sécurité

- Démon : écoute sur 127.0.0.1 uniquement, en-tête Host vérifié, jeton de session sur toute l'API, JSON obligatoire en écriture, CSP stricte, seuls les fichiers de la bibliothèque sont lisibles.
- yt-dlp lancé sans shell, arguments en tableau, `--ignore-config`, URL validée et placée après `--`, adresses privées refusées.
- Application : fenêtre isolée (sandbox, sans Node), navigation externe ouverte dans le navigateur, binaires embarqués vérifiés par SHA-256 au démarrage, aucun appel réseau implicite.

## Limites connues

- Taille de l'installeur (~330 Mo) : ffmpeg et Deno embarqués en versions complètes. Piste : build ffmpeg minimal.
- Les sites vidéo changent souvent : prévoir des mises à jour régulières du moteur (un clic dans l'app) et de l'extension.
- Android : non livré dans cette version.
- Mise à jour automatique de l'application elle-même : non activée (nécessite un serveur de publication).

## Licence

Code source sous licence **MIT** — voir [`LICENSE`](LICENSE). © 2026 Tarek Belhadj (KAYZEN).

Les composants tiers (yt-dlp, FFmpeg, Deno, Electron, whisper.cpp…) restent soumis à leurs propres licences :
voir [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md). Les données de segments SponsorBlock sont sous licence
CC BY-NC-SA 4.0 (usage non commercial, attribution requise). Le nom et le logo KAYZEN Flux ne sont pas couverts par la licence MIT.
