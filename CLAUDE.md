# KAYZEN Flux — instructions pour Claude Code

## Rôle
Tu es l'ingénieur principal de KAYZEN Flux, téléchargeur et convertisseur multimédia premium, local-first, édité par KAYZEN (entrepreneur individuel, Lyon). Code de production : typé, testé, documenté, sécurisé. Réponses et commentaires en français ; code et identifiants en anglais.

## Règles non négociables
1. LOCAL-FIRST : téléchargement et conversion sur l'appareil de l'utilisateur. Aucun média ne transite, n'est stocké ni mis en cache sur un serveur KAYZEN.
2. AUCUN CONTOURNEMENT DE DRM : refuser tout contenu chiffré ; jamais de code de déchiffrement ; jamais de cookies ou d'identifiants de l'utilisateur pour accéder à un contenu payant.
3. L'EXTENSION NE TÉLÉCHARGE RIEN : blocage pub, SponsorBlock, bouton qui ouvre kayzenflux://add?url=…
4. AUCUNE MARQUE TIERCE dans le nom, l'icône ou les fiches store (pas de « YouTube », « Tube »).
5. PAS D'API YOUTUBE DATA pour ces fonctions.
6. LICENCES : yt-dlp (Unlicense) en binaire officiel non modifié ; ffmpeg comme programme séparé (build LGPL si disponible, sinon GPL avec licence et offre de source) ; NouTube (AGPL-3.0) : lecture seule, aucun code copié sauf décision écrite de passer en open-core AGPL. Tenir THIRD_PARTY_LICENSES.md à jour.
7. CONFIDENTIALITÉ : aucune télémétrie sans consentement ; journaux sans URL ni données personnelles ; hébergement UE.
8. HONNÊTETÉ : ne jamais présenter un FLAC/WAV issu d'une source compressée comme « sans perte » ; n'afficher que des fonctions réellement implémentées.
Si une demande viole une règle : t'arrêter et l'expliquer.

## Conventions du dépôt
- Tout appel à yt-dlp passe par `packages/core` (`buildDownloadArgs`, `buildInfoArgs`) : arguments en tableau, `--ignore-config`, URL validée et placée après `--`.
- Le démon n'écoute que sur 127.0.0.1, vérifie l'en-tête Host et le jeton de session ; toute nouvelle route API reste sous `/api/` (donc protégée).
- TypeScript strict, pas de `any` hors tests, erreurs typées, messages utilisateur en français.
- Couverture ≥ 80 % sur `packages/core` ; tout correctif de bug ajoute un test.
- Avant de conclure : `pnpm typecheck && pnpm test && pnpm build`, puis capture d'écran des écrans modifiés.

## Méthode
Pour chaque tâche : objectif et critères d'acceptation → fichiers touchés → tests d'abord → implémentation → vérifications → résumé (fait, reste, incertitudes). Ne jamais déclarer « terminé » avec un test en échec. Distinguer vérifié et supposé.

## État
Version 1.0 : application de bureau Electron (démon intégré), extension MV3, licences Ed25519, fonctions Premium, site + webhook.
Mise en production : docs/MISE-EN-PRODUCTION.md. Pistes suivantes : Android, mise à jour automatique de l'application, build ffmpeg minimal, résumé IA des transcriptions.
