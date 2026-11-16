# KAYZEN Flux — version 0.1 (MVP desktop)

Téléchargeur et convertisseur multimédia **local-first**, propulsé par [yt-dlp](https://github.com/yt-dlp/yt-dlp).
Tout s'exécute sur l'ordinateur de l'utilisateur : aucun média ne transite par un serveur KAYZEN.

> Usage personnel uniquement, pour des contenus que l'utilisateur a le droit de copier.
> Les contenus protégés par DRM sont systématiquement refusés.

## Ce qui fonctionne dans cette version

| Écran | Fonctions |
| --- | --- |
| Accueil & Convertisseur | Coller un lien (ou le coller n'importe où sur la page), aperçu (titre, durée, définition max, débit audio source, licence Creative Commons), 7 formats, SponsorBlock, métadonnées + pochette, sous-titres, playlists |
| Téléchargements | File locale en parallèle, progression en direct (vitesse, temps restant, étape de conversion), annuler, réessayer, ouvrir le dossier |
| Bibliothèque & Lecteur | Historique local, recherche, filtres audio/vidéo/favoris, export JSON, lecteur audio/vidéo hors connexion (mini-fenêtre vidéo), suppression du fichier ou de l'entrée |
| Moteur & Paramètres | Dossier, format par défaut, options, parallélisme, versions de yt-dlp/ffmpeg, mise à jour du moteur |
| Raccourcis | Ctrl+K, G puis H/D/B/S, Espace/J/L/M dans le lecteur, `?` |

Mode clair et sombre, interface en français, navigation au clavier, compatible mobile.

## Démarrage

Prérequis : **Node.js 22+**, **pnpm**, **yt-dlp**, **ffmpeg** (et idéalement **Deno**, recommandé par yt-dlp pour certains sites).

```bash
# Windows : winget install yt-dlp.yt-dlp Gyan.FFmpeg DenoLand.Deno
# macOS   : brew install yt-dlp ffmpeg deno
# Linux   : pipx install yt-dlp && sudo apt install ffmpeg

pnpm install
pnpm build
pnpm start          # → http://127.0.0.1:49152/
```

Développement avec rechargement à chaud : `pnpm --filter @kayzen-flux/daemon dev` puis
`pnpm --filter @kayzen-flux/ui dev` (ouvrir l'URL Vite avec `?token=` copié depuis la page du démon).

### Variables d'environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `KAYZEN_PORT` | Port local | `49152` |
| `KAYZEN_DOWNLOAD_DIR` | Dossier de téléchargement initial | `~/Downloads/KAYZEN Flux` |
| `KAYZEN_DATA_DIR` | Réglages et bibliothèque (JSON) | `~/.kayzen-flux` |
| `KAYZEN_YTDLP` / `KAYZEN_FFMPEG` | Chemins des binaires | `yt-dlp` / `ffmpeg` du PATH |
| `KAYZEN_TIER` | `premium` pour tester l'offre payante (sera remplacé par la licence, phase 3) | `free` |
| `KAYZEN_ALLOW_LOCAL` | `1` = accepte les URL locales (tests uniquement) | désactivé |

## Architecture

```
packages/core   Logique pure et testée : validation d'URL, préréglages, construction des
                arguments yt-dlp (tableau, URL après « -- »), lecture JSON, progression,
                détection DRM, messages d'erreur en français.
apps/daemon     Serveur Node lié à 127.0.0.1 : file de tâches, flux temps réel (SSE),
                bibliothèque JSON, lecture des médias avec Range. Sert l'interface.
apps/ui         React + Tailwind (jetons de la maquette Stitch Kayzen), polices auto-hébergées.
```

### Sécurité du démon local

- Écoute **uniquement** sur `127.0.0.1` ; en-tête `Host` vérifié (anti *DNS rebinding*).
- Jeton de session aléatoire injecté dans la page, exigé sur toute l'API (un site tiers ne peut pas piloter le démon).
- Requêtes d'écriture en `application/json` uniquement (bloque les requêtes CSRF simples) ; corps limité à 64 Ko.
- yt-dlp lancé sans shell, arguments en tableau, `--ignore-config`, URL validée (http/https, pas d'identifiants, pas d'adresses privées) et placée après `--`.
- Seuls les fichiers enregistrés dans la bibliothèque peuvent être lus (aucun chemin arbitraire).
- CSP stricte, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.

## Tests

```bash
pnpm test        # 36 tests moteur + 10 tests démon (dont 2 téléchargements réels de bout en bout)
pnpm typecheck
```

Les tests de bout en bout génèrent une vidéo avec ffmpeg, la servent en local puis la font
télécharger et convertir (MP3 et MP4) par le vrai yt-dlp.

## Écarts volontaires avec la maquette Stitch

| Maquette | Choix retenu | Raison |
| --- | --- | --- |
| « KayzenTube », « Coller une URL YouTube », « 1-Clic YouTube » | « KAYZEN Flux », « Collez un lien » | Pas de marque tierce dans le nom ni l'interface |
| « contournement des restrictions », « Bypass Anti-Bot », « Déchiffrement n-sig » | Supprimé | Aucun contournement de mesure technique |
| « FLAC 24-bit », « Dolby Atmos », « Qualité master » | « FLAC (conteneur) » avec avertissement | Un conteneur sans perte n'ajoute pas de qualité à une source compressée |
| Paroles synchronisées (texte d'un poème protégé) | Non repris | Droit d'auteur |
| « Flux de découverte » de morceaux populaires | Non repris | Pas de catalogue incitant au téléchargement |
| iOS via AltStore | Non proposé | Règle 5.2.3 de l'App Store |
| Interface CLI, raccourcis personnalisables | Reportés | Non implémentés : rien n'est affiché qui n'existe pas |

## Prochaines étapes (roadmap)

1. Emballer en application Tauri (installeurs signés), embarquer yt-dlp/ffmpeg LGPL/Deno en *sidecars* avec empreintes SHA-256.
2. Extension navigateur (lecture sans pub + bouton « Envoyer vers KAYZEN Flux »).
3. Licences Premium signées, site, paiement, mentions légales.
4. Abonnements de chaînes, transcription Whisper locale, résumé IA, tags musicaux avancés.

Voir `CLAUDE.md` pour le prompt maître et les règles non négociables.
