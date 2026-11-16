# KAYZEN Flux 1.0

Téléchargeur et convertisseur multimédia **local-first**, sans publicité ni pistage, propulsé par
[yt-dlp](https://github.com/yt-dlp/yt-dlp). Application de bureau (Windows, macOS, Linux), extension
navigateur de lecture sans pub, site vitrine avec vente et livraison automatique des licences.

> Usage personnel, pour des contenus que l'utilisateur a le droit de copier. Les contenus protégés par DRM sont refusés.
> **Avant publication : suivre [`docs/MISE-EN-PRODUCTION.md`](docs/MISE-EN-PRODUCTION.md).**

## Contenu du dépôt

| Dossier | Rôle | Tests |
| --- | --- | --- |
| `packages/core` | Logique pure : URL, formats, arguments yt-dlp, progression, DRM, erreurs, transcription, flux | 47 |
| `apps/daemon` | Moteur local (127.0.0.1) : file de tâches, temps réel, bibliothèque, licences, abonnements | 18 (dont 6 téléchargements réels) |
| `apps/ui` | Interface React + Tailwind (maquette Stitch Kayzen, clair/sombre) | — (vérifiée par captures) |
| `apps/desktop` | Application Electron : moteur intégré, binaires embarqués vérifiés, lien `kayzenflux://` | 8 |
| `apps/extension` | Extension MV3 Chrome/Edge/Firefox : lecture sans pub, SponsorBlock, « Envoyer vers » | 12 + test dans Chrome |
| `apps/site` | Site vitrine statique + pages légales + webhook Stripe → licence par e-mail | 5 |
| `tools/license.mjs` | Création des clés et émission des licences (Ed25519) | — |

## Fonctions

**Gratuit** : MP3, M4A, Opus, MP4 jusqu'en 1080p · SponsorBlock · titre/artiste/pochette · sous-titres ·
playlists de 25 éléments · 2 téléchargements en parallèle · bibliothèque, recherche, favoris, export ·
lecteur audio/vidéo hors connexion · modèles de nom de fichier · raccourcis clavier · mode sombre.

**Premium** (licence signée, vérifiée hors ligne) : 4K, FLAC · playlists illimitées · 6 en parallèle ·
abonnements à des chaînes, playlists ou podcasts (téléchargement automatique des nouveautés) ·
un fichier par chapitre · volume normalisé (EBU R128) · transcription Markdown horodatée.

**Extension** : blocage des publicités (requêtes, emplacements, données du lecteur, filet de sécurité),
saut des segments sponsorisés (requête anonymisée par préfixe de hachage), masquage des Shorts,
bouton et menu contextuel « Envoyer vers KAYZEN Flux ». Aucune collecte de données, aucun téléchargement.

## Développement

Prérequis : Node.js 22+, pnpm 10, et pour les tests de bout en bout `yt-dlp` + `ffmpeg` dans le PATH.

```bash
pnpm install
pnpm test                      # tous les tests
pnpm typecheck
pnpm build                     # core, démon, interface, application, extension

pnpm start                     # version navigateur : http://127.0.0.1:49152
pnpm --filter @kayzen-flux/desktop start        # application de bureau (dev)
pnpm --filter @kayzen-flux/extension build      # extension → apps/extension/dist/{chromium,firefox}
KAYZEN_ALLOW_DEV_KEY=1 pnpm --filter @kayzen-flux/desktop dist:linux   # AppImage + .deb de TEST
```

Licence de test (clé de développement) : `node tools/license.mjs issue moi@exemple.fr`.
Forcer Premium sans licence (dev) : `KAYZEN_TIER=premium`.

## Sécurité

- Démon : écoute sur 127.0.0.1 uniquement, en-tête Host vérifié, jeton de session sur toute l'API, JSON obligatoire en écriture, CSP stricte, seuls les fichiers de la bibliothèque sont lisibles.
- yt-dlp lancé sans shell, arguments en tableau, `--ignore-config`, URL validée et placée après `--`, adresses privées refusées.
- Application : fenêtre isolée (sandbox, sans Node), navigation externe ouverte dans le navigateur, binaires embarqués vérifiés par SHA-256 au démarrage, aucun appel réseau implicite.
- Licences : Ed25519, clé privée jamais dans l'application ; build de distribution bloqué avec la clé de développement.
- Webhook : signature Stripe vérifiée (HMAC, tolérance 5 min), contenu de l'e-mail échappé.

## Limites connues

- Taille de l'installeur (~330 Mo) : ffmpeg et Deno embarqués en versions complètes. Piste : build ffmpeg minimal.
- Les sites vidéo changent souvent : prévoir des mises à jour régulières du moteur (un clic dans l'app) et de l'extension.
- Android : non livré dans cette version.
- Mise à jour automatique de l'application elle-même : non activée (nécessite un serveur de publication).
