# KAYZEN Flux — dossier de consultation juridique

> **Mise à jour du 17/11/2026 — changement de modèle.** KAYZEN Flux devient entièrement gratuit et open source (licence MIT, dépôt public `kayzen-lyon/kayzenflux`). L'offre Premium, la vente, Stripe, Resend, les clés de licence, les CGV et la page `merci` ont été supprimés du code. Les passages de ce dossier qui portent sur la vente, le paiement, le droit de rétractation, le médiateur de la consommation et l'envoi des licences sont donc **sans objet** ; les questions sur le positionnement du produit, le DRM, SponsorBlock (désormais usage non commercial), FFmpeg, l'extension et la confidentialité restent d'actualité. Ce dossier sera à réviser avant envoi.

**Destinataire** : avocat(e) en propriété intellectuelle / droit du numérique
**Client** : Tarek BELHADJ EI (entrepreneur individuel, micro-entreprise), nom commercial KAYZEN — 6 rue Pierre Termier, 69009 Lyon — SIRET 493 857 262 00098 — TVA non applicable, art. 293 B CGI — contact@kayzen-lyon.fr
**Date** : 17 novembre 2026
**Objet** : validation juridique avant la mise en vente de KAYZEN Flux (application de bureau + extension de navigateur), offre gratuite et Premium (3,99 €/mois, 29 €/an, 59 € à vie).

> Les faits techniques ci-dessous sont tirés du code source (chemins de fichiers cités, dépôt privé `kayzen-lyon/kayzenflux`). Les sources externes sont liées ; les citations font moins de 15 mots. Les décisions rapportées par des sources secondaires sont signalées comme telles et doivent être vérifiées sur les décisions elles-mêmes. Rien n'est encore publié : site protégé par mot de passe et `noindex`, aucune vente.

---

## Sommaire

0. Description du produit
1. Positionnement d'un téléchargeur (L.335-2-1, copie privée, stream-rippers) — **point le plus sensible**
2. Mesures techniques de protection (DRM, « rolling cipher ») — **risque potentiellement bloquant**
3. Conditions d'utilisation des plateformes
4. Extension de blocage publicitaire
5. SponsorBlock (données CC BY-NC-SA)
6. Licences des composants libres
7. CGV : rétractation, médiateur, garanties, résiliation
8. RGPD
9. Règles des stores d'extensions
10. Mentions légales d'un entrepreneur individuel
11. Marque « KAYZEN Flux »
12. À décider par Tarek

---

## 0. Description du produit (faits)

- **Application de bureau** (Windows, macOS, Linux ; Electron) qui pilote, sur l'ordinateur de l'utilisateur, le programme libre **yt-dlp** (téléchargement depuis « plus de 1 700 sites ») et **FFmpeg** (conversion). Un moteur local écoute uniquement sur 127.0.0.1. Fichiers : `apps/desktop`, `apps/daemon/src/engine.ts`, `apps/daemon/src/server.ts`.
- **Aucun média ne passe par un serveur KAYZEN** : le site ne sert que des pages statiques et un webhook de paiement (`apps/site/api/stripe-webhook.js`).
- Formats : MP3, M4A, Opus, MP4 jusqu'en 1080p (gratuit) ; 4K, FLAC, playlists illimitées, abonnements automatiques à des chaînes, découpe par chapitres, normalisation du volume, transcription (Premium). Fichiers : `packages/core/src/presets.ts`, `packages/core/src/premium.ts`, `README.md`.
- **Extension de navigateur** (Chrome, Edge, Firefox) qui ne télécharge rien : blocage des publicités, saut des segments sponsorisés (SponsorBlock), masquage des Shorts, bouton « Envoyer vers KAYZEN Flux » qui ouvre l'application via un lien `kayzenflux://`. Fichiers : `apps/extension/src/*.ts`, `apps/extension/scripts/build.mjs`.
- **Licence Premium** : clé signée Ed25519, vérifiée hors ligne, envoyée par e-mail après paiement Stripe. Fichiers : `apps/daemon/src/license.ts`, `tools/license.mjs`.
- Communication actuelle du site (`apps/site/public/index.html`) : titre « Téléchargez et convertissez vos vidéos et musiques » ; accroche comparant le produit à « un convertisseur en ligne » ; FAQ « Est-ce légal ? » renvoyant à la responsabilité de l'utilisateur. Le site ne cite aucune plateforme par son nom ; l'extension, elle, n'agit que sur des pages YouTube (`apps/extension/scripts/build.mjs`, constante `MATCHES`).

**Pièces générales à joindre** : `README.md`, `THIRD_PARTY_LICENSES.md`, `docs/STORES.md`, captures `docs/captures/`, les quatre pages légales `apps/site/public/{mentions-legales,cgu,cgv,confidentialite}.html`, la page d'accueil `apps/site/public/index.html`.

---

## 1. Positionnement d'un téléchargeur

### Faits techniques
- L'application télécharge depuis l'URL que l'utilisateur colle ; elle ne propose ni catalogue, ni moteur de recherche de contenus, ni partage entre utilisateurs. Toute commande yt-dlp est construite dans `packages/core/src/args.ts` (`buildDownloadArgs`) : arguments en tableau, `--ignore-config`, URL validée (`packages/core/src/url.ts`) et placée après `--`.
- Les URL contenant des identifiants sont refusées (`packages/core/src/url.ts`) ; aucune option de cookies, d'identifiant ou de mot de passe n'est passée à yt-dlp, ce qu'un test vérifie (`packages/core/test/core.test.ts`, test « n'utilise jamais d'option de contournement »). Conséquence : pas d'accès aux contenus réservés aux abonnés.
- Fonctions qui favorisent un usage massif : playlists illimitées et **abonnements automatiques à des chaînes** (Premium, `apps/daemon/src/subscriptions.ts`), extraction audio en MP3/FLAC.
- Le produit détecte la mention de licence Creative Commons d'une vidéo (`packages/core/src/info.ts`, champ `isCreativeCommons`).

### Droit applicable et sources
- **Art. L.335-2-1 CPI** : 3 ans d'emprisonnement et 300 000 € d'amende pour qui édite ou met à disposition, sciemment, un logiciel « manifestement destiné à la mise à disposition du public non autorisée » d'œuvres, ou incite à son usage, y compris par la publicité. Source : [Légifrance, L.335-2-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006279235).
- **Copie privée, art. L.122-5 2° et L.211-3 CPI** : la condition de **source licite** a été ajoutée par la loi n° 2011-1898 du 20 décembre 2011. Source secondaire : [Kohen Avocats, 2026](https://kohenavocats.com/convertisseur-youtube-mp3-legal-telecharger-video-musique-youtube-copie-privee-risques-france-2026/).
- **CJUE, 10 avril 2014, ACI Adam, C-435/12** : une législation ne peut pas assimiler copies de sources licites et copies de sources contrefaites. Source : [communiqué CJUE](https://curia.europa.eu/jcms/upload/docs/application/pdf/2014-04/cp140058fr.pdf).
- **Tribunal judiciaire de Paris, actions de la SCPP contre les FAI (art. L.336-2 CPI)** visant des convertisseurs en ligne : selon une source secondaire, décisions du 26 sept. 2024 (n° 24/08301), 30 janv. 2025 (n° 24/15306, Y2mate et autres, blocage 18 mois), 26 mars 2026 (n° 26/03017) et 18 juin 2026 (n° 26/07219). Source : [Kohen Avocats](https://kohenavocats.com/convertisseur-youtube-mp3-legal-telecharger-video-musique-youtube-copie-privee-risques-france-2026/) — **à vérifier sur les décisions**. Nouvelle assignation SCPP du 1er juillet 2025 visant aussi les sites « y2mate.is » et « 4kdownload.to ». Source : [JustGeek, 22 août 2025](https://www.justgeek.fr/convertisseurs-youtube-mp3-blocage-scpp-141040/). Ces griefs portaient sur le contournement des protections et l'hébergement temporaire des fichiers sur les serveurs des sites (même source).
- **Allemagne** : LG Hamburg (avril 2023) puis **OLG Hamburg, 21 nov. 2024, 5 U 54/23**, contre l'hébergeur du site youtube-dl.org (voir aussi § 2). Sources : [IFPI, 3 avril 2023](https://www.ifpi.org/record-companies-in-germany-take-successful-action-against-hosting-provider-of-stream-ripping-software-youtube-dl/), [heise.de](https://heise.de/-10181247), [Digital Music News, 25 nov. 2024](https://www.digitalmusicnews.com/2024/11/25/stream-rippers-ifpi-appeal-ruling-germany/).
- **États-Unis (pour information)** : *Yout LLC v. RIAA* (D. Conn. 2022, appel n° 22-2760 pendant devant le 2e circuit en avril 2026) ; *Cordova v. Huneault* (N.D. Cal., janv. 2026) retient que le « rolling cipher » peut être une mesure de contrôle d'accès. Sources : [Music Business Worldwide, oct. 2025](https://www.musicbusinessworldwide.com/facing-stream-ripping-allegations-from-labels-suno-udio-weigh-in-on-separate-case-to-challenge-ruling-that-makes-youtube-downloading-illegal/), [Digital Music News, 13 avril 2026](https://www.digitalmusicnews.com/2026/04/13/yout-v-riaa-cox-decision/), [TorrentFreak, 5 févr. 2026](https://torrentfreak.com/ripping-clips-for-youtube-reaction-videos-can-violate-the-dmca-court-rules/).

### Risque
**Élevé.** Le logiciel n'est pas « manifestement destiné » à la contrefaçon (outil généraliste, usages licites réels, refus des DRM), mais : (a) la communication actuelle se compare aux convertisseurs en ligne qui font l'objet de blocages judiciaires ; (b) l'offre payante met en avant l'audio MP3/FLAC et les abonnements automatiques, ce qui pourrait être lu comme une incitation (L.335-2-1, 2°) ; (c) la copie privée suppose une source licite et ne couvre pas le contournement d'une mesure technique (§ 2).

### Questions précises
1. Au vu de l'architecture (logiciel local, pas de serveur, URL fournie par l'utilisateur), le produit peut-il être qualifié de logiciel « manifestement destiné » au sens de L.335-2-1 ? Quels éléments de communication ou de fonction feraient basculer cette qualification ?
2. Les décisions du TJ Paris contre les convertisseurs (2024-2026) ont-elles un raisonnement transposable à un logiciel installé localement ? Quelle a été l'issue de l'assignation SCPP du 1er juillet 2025 ?
3. La copie privée (L.122-5 2°) peut-elle couvrir un fichier MP3 tiré d'une vidéo mise en ligne légalement, sachant que la plateforme l'interdit dans ses conditions (§ 3) ? L'éditeur peut-il s'appuyer sur cette exception pour son propre compte ?
4. Faut-il retirer ou restreindre : l'accroche « convertisseur en ligne », les abonnements automatiques à des chaînes, les playlists illimitées, l'audio seul ? Faut-il un écran d'avertissement au premier lancement ?
5. Exposition personnelle : en EI, quelles conséquences sur le patrimoine personnel en cas de condamnation civile ou pénale ? Une société (SASU) serait-elle préférable pour ce produit ?

### Pièces à joindre
`packages/core/src/args.ts`, `packages/core/src/url.ts`, `packages/core/test/core.test.ts`, `apps/daemon/src/subscriptions.ts`, `apps/site/public/index.html`, `apps/site/public/cgu.html`.

---

## 2. Mesures techniques de protection (DRM et « rolling cipher »)

### Faits techniques (vérifiés dans le code)
- **Refus des DRM** : `detectDrm()` dans `packages/core/src/info.ts` marque un média comme protégé si yt-dlp le signale ou si **tous** ses formats sont chiffrés ; le moteur refuse alors le téléchargement (`apps/daemon/src/engine.ts`, fonction de récupération des informations) avec le message « KAYZEN Flux ne télécharge jamais de contenu chiffré » (`packages/core/src/errors.ts`). Les erreurs Widevine, PlayReady et FairPlay sont classées « drm ».
- L'option yt-dlp `--allow-unplayable-formats` (qui permettrait de récupérer des formats chiffrés) n'est jamais passée ; un test le vérifie (`packages/core/test/core.test.ts`). Si seuls certains formats sont chiffrés, yt-dlp ne télécharge que les formats non chiffrés.
- **Point délicat** : l'application embarque **Deno**, moteur JavaScript dont yt-dlp a besoin pour certains sites (`THIRD_PARTY_LICENSES.md`, `apps/desktop/scripts/fetch-sidecars.mjs`). Depuis la version du 12 novembre 2025, yt-dlp exige un tel moteur pour YouTube, dont les mécanismes sont devenus trop complexes pour l'ancienne méthode. Source : [Gigazine, 13 nov. 2025](https://www.gigazine.net/gsc_news/en/20251113-yt-dlp-required-deno-javascript-runtime). Concrètement, yt-dlp exécute le code du lecteur de la plateforme pour obtenir les adresses réelles des flux (mécanisme souvent appelé « rolling cipher » ou « signature »). Ce n'est pas un DRM au sens Widevine, mais c'est ce mécanisme que la jurisprudence allemande qualifie de mesure technique.

### Droit applicable et sources
- **OLG Hamburg, 21 nov. 2024, 5 U 54/23** : le « rolling cipher » de YouTube est une mesure technique de protection efficace (§ 95a UrhG), car un utilisateur moyen ne peut pas le contourner facilement ; l'utilisateur moyen d'un tel outil est jugé de mauvaise foi ; l'hébergeur du site renvoyant vers youtube-dl est tenu. Source : [heise.de](https://heise.de/-10181247).
- **France** : art. L.331-5 (définition des mesures techniques efficaces), L.335-3-1 (contournement : 3 750 € ; fourniture de moyens de contournement : 6 mois et 30 000 €), R.335-3. Selon une source secondaire, **aucune décision française consultée ne tranche** la qualification des protections de YouTube. Source : [Kohen Avocats](https://kohenavocats.com/convertisseur-youtube-mp3-legal-telecharger-video-musique-youtube-copie-privee-risques-france-2026/). Textes à lire sur Légifrance (non lisibles depuis l'environnement de recherche) : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069414/LEGISCTA000006161659/
- **Cass. 1re civ., 28 févr. 2006, n° 05-15.824 (Mulholland Drive)** : la copie privée ne fait pas obstacle aux mesures techniques. Source secondaire : [Kohen Avocats](https://kohenavocats.com/convertisseur-youtube-mp3-legal-telecharger-video-musique-youtube-copie-privee-risques-france-2026/).

### Risque
**Potentiellement bloquant.** Si le raisonnement de l'OLG Hamburg était retenu en France, distribuer contre rémunération un logiciel qui embarque yt-dlp et Deno pour lire ces protections pourrait relever de L.335-3-1 (fourniture d'un moyen de contournement), indépendamment du refus des DRM. Les CGU actuelles interdisent à l'utilisateur « toute tentative de contourner une mesure technique de protection » alors que le logiciel lui-même pourrait être jugé le faire : contradiction à résoudre.

### Questions précises
1. Le mécanisme d'obscurcissement des URL de flux de YouTube peut-il être qualifié de « mesure technique efficace » au sens de L.331-5 en droit français ? Existe-t-il une décision ou une doctrine française sur ce point ?
2. Si oui, l'éditeur d'un logiciel qui embarque yt-dlp (sans le modifier) engage-t-il sa responsabilité au titre de L.335-3-1 II ? La qualité d'outil généraliste (1 700 sites) ou l'exception d'interopérabilité change-t-elle l'analyse ?
3. Faut-il exclure YouTube et YouTube Music de l'application (liste d'exclusion dans `packages/core`), ou limiter le service aux contenus sous licence Creative Commons / aux contenus de l'utilisateur sur ces plateformes ?
4. Comment reformuler l'article 3 des CGU pour qu'il soit cohérent avec le fonctionnement réel ?

### Pièces à joindre
`packages/core/src/info.ts`, `packages/core/src/errors.ts`, `apps/daemon/src/engine.ts`, `apps/desktop/scripts/fetch-sidecars.mjs`, `THIRD_PARTY_LICENSES.md`, `apps/site/public/cgu.html`.

---

## 3. Conditions d'utilisation des plateformes

### Faits
- L'application accède aux sites sans compte ni cookie de l'utilisateur (§ 1). L'extension modifie les pages YouTube (`apps/extension/src/content.ts`, `inject.ts`).
- Les CGU de KAYZEN Flux (art. 3) rappellent à l'utilisateur de respecter les conditions des sites ; la FAQ indique que le téléchargement peut leur être contraire.

### Sources
- Conditions d'utilisation de YouTube, version en vigueur depuis le **9 janvier 2026** : elles interdisent de télécharger un contenu sauf autorisation du service, écrite ou de la loi ; d'accéder au service par des « procédés automatisés » ; de contourner les fonctions de sécurité, y compris celles qui empêchent la copie. Elles ne contiennent pas d'interdiction expresse du blocage des publicités. Source : [YouTube — Conditions d'utilisation (FR)](https://www.youtube.com/static?template=terms&gl=FR&hl=fr).

### Risque
Moyen. Les CGU lient l'utilisateur, pas KAYZEN directement, mais un éditeur qui vend un outil conçu pour les enfreindre s'expose à une action en responsabilité civile (complicité de violation contractuelle, concurrence déloyale) et à des mesures techniques de la plateforme (blocage).

### Questions précises
1. L'éditeur d'un outil peut-il être poursuivi par une plateforme pour inciter ses utilisateurs à violer ses conditions d'utilisation ? Sur quel fondement en droit français ?
2. La réserve « sauf si la loi l'autorise » des conditions de YouTube couvre-t-elle la copie privée française ?

### Pièces à joindre
`apps/site/public/cgu.html`, `apps/site/public/index.html` (FAQ), `apps/extension/src/content.ts`.

---

## 4. Extension de blocage publicitaire

### Faits techniques
- Blocage réseau par `declarativeNetRequest` : 10 règles (domaines doubleclick.net, googlesyndication.com, googleadservices.com, imasdk.googleapis.com, et chemins publicitaires de youtube.com). Fichier : `apps/extension/static/rules.json`.
- **Modification du code de la page** : un script exécuté dans le contexte de la page remplace `JSON.parse` et `Response.prototype.json` et intercepte les variables `ytInitialPlayerResponse` / `ytInitialData` pour retirer les données publicitaires du lecteur (principe « json-prune »). Fichier : `apps/extension/src/inject.ts`.
- Aucun modèle de « liste blanche payante ». L'extension est gratuite.

### Sources
- **BGH, 19 avril 2018, I ZR 154/16 (Werbeblocker II)** : l'offre d'Adblock Plus n'est ni une entrave ciblée, ni une perturbation générale du marché, ni une pratique agressive ; la liste blanche payante est admise. Source : [Fieldfisher](https://www.fieldfisher.com/en/services/intellectual-property/intellectual-property-blog/german-federal-court-of-justice-ruling-ad-blockers-are-allowed).
- **BGH, 31 juillet 2025, I ZR 131/23 (Werbeblocker IV)** : arrêt de l'OLG Hamburg cassé et renvoyé ; la question est de savoir si Adblock Plus modifie sans autorisation la programmation des pages, protégée comme programme d'ordinateur (§ 69a UrhG). Affaire pendante. Source : [beck-aktuell](https://www.beck-aktuell.de/heute-im-recht/rechtsprechung/bgh-izr13123-werbeblocker-springer-adblock-plus-urheberrecht-2025-07-31). Mozilla a alerté sur les conséquences pour les extensions. Source : [blog Mozilla, 14 août 2025](https://blog.mozilla.org/netpolicy/2025/08/14/is-germany-on-the-brink-of-banning-ad-blockers-user-freedom-privacy-and-security-is-at-risk/).
- **France** : des éditeurs avaient annoncé des actions contre les bloqueurs en 2015-2016 ; **aucune décision française n'a été trouvée** dans ce qui a pu être consulté. Source : [Mac4Ever](https://www.mac4ever.com/divers/96229-les-editeurs-francais-bientot-en-proces-contre-les-ad-bloqueurs) ; état du débat : [Siècle Digital, 21 août 2025](https://siecledigital.fr/2025/08/21/publicite-en-ligne-lallemagne-pourrait-ouvrir-la-voie-a-une-interdiction-des-adblockers-en-europe/).

### Risque
Moyen, en hausse. La technique de `inject.ts` (réécriture des fonctions et données du lecteur) est précisément du type visé par la théorie du « programme d'ordinateur modifié » soutenue par Axel Springer. L'extension étant distribuée dans toute l'UE, une décision allemande défavorable s'appliquerait aux utilisateurs allemands.

### Questions précises
1. En droit français, un bloqueur qui modifie en mémoire les données et fonctions JavaScript d'une page peut-il porter atteinte au droit d'auteur sur le logiciel du site (L.122-6) ou constituer un acte de concurrence déloyale ?
2. Faut-il limiter l'extension au blocage réseau (`rules.json`) et retirer la réécriture du lecteur (`inject.ts`) en attendant l'issue de Werbeblocker IV ? Faut-il exclure l'Allemagne de la diffusion ?
3. Le fait que l'extension serve aussi de produit d'appel pour une application payante change-t-il l'analyse (caractère commercial) ?

### Pièces à joindre
`apps/extension/src/inject.ts`, `apps/extension/static/rules.json`, `apps/extension/scripts/build.mjs`, `docs/STORES.md`.

---

## 5. SponsorBlock

### Faits techniques
- **Extension** : interroge `https://sponsor.ajay.app/api/skipSegments/<préfixe>` en n'envoyant que 4 caractères d'un hachage SHA-256 de l'identifiant de la vidéo (`apps/extension/src/background.ts`).
- **Application de bureau** : l'option SponsorBlock, activée par défaut (`apps/daemon/src/server.ts`, réglages par défaut), fait passer `--sponsorblock-remove sponsor,selfpromo,interaction` à yt-dlp (`packages/core/src/args.ts`), qui interroge la même base et **coupe les segments dans le fichier**. La fonction est dans l'offre gratuite, mais l'application est commercialisée (Premium).
- La fiche de l'extension et `THIRD_PARTY_LICENSES.md` indiquent déjà la licence CC BY-NC-SA 4.0 et signalent l'usage commercial comme « à valider ».

### Sources
- La base et l'API SponsorBlock sont sous **CC BY-NC-SA 4.0** sauf autorisation explicite ; l'auteur invite à le contacter pour un autre usage et peut accorder une autre licence. Source : [sponsor.ajay.app/database](https://sponsor.ajay.app/database).

### Risque
Moyen. La clause « NC » (pas d'usage commercial) pose question pour un produit freemium, même si la fonction est gratuite. La clause « SA » (partage à l'identique) pose question pour les données intégrées au produit.

### Questions précises
1. Le simple fait d'interroger l'API (sans redistribuer la base) depuis un produit vendu constitue-t-il un « usage commercial » au sens de CC BY-NC-SA 4.0 ?
2. Proposer SponsorBlock uniquement dans l'extension gratuite et la version gratuite suffit-il, alors que la même application contient l'offre payante ?
3. Faut-il demander une autorisation écrite à l'auteur ? (Modèle de demande à préparer.) Quelle mention d'attribution est requise ?

### Pièces à joindre
`apps/extension/src/background.ts`, `apps/extension/src/shared.ts`, `packages/core/src/args.ts`, `apps/daemon/src/server.ts`, `THIRD_PARTY_LICENSES.md`.

---

## 6. Licences des composants libres

### Faits
| Composant | Licence vérifiée | Mode d'intégration (code) |
| --- | --- | --- |
| yt-dlp | Unlicense (domaine public) — [LICENSE](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE) | Binaire officiel non modifié, téléchargé depuis les « releases » GitHub (`apps/desktop/scripts/fetch-sidecars.mjs`) |
| Composants inclus dans l'exécutable yt-dlp | Python (PSF), OpenSSL, zlib, SQLite, etc. — [THIRD_PARTY_LICENSES.txt de yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/THIRD_PARTY_LICENSES.txt) | Non listés dans notre `THIRD_PARTY_LICENSES.md` |
| FFmpeg / FFprobe | **GPL v3** (builds yt-dlp/FFmpeg-Builds sous Linux/Windows, ffmpeg-static b6.0 sous macOS) | Programme séparé, appelé en ligne de commande ; licence fournie ; source « sur demande pendant 3 ans » + liens vers les dépôts amont (`THIRD_PARTY_LICENSES.md`) |
| Deno | MIT — [LICENSE.md](https://github.com/denoland/deno/blob/main/LICENSE.md) | Binaire embarqué |
| Electron / Chromium | MIT / BSD et autres | Embarqué |
| NouTube | AGPL-3.0 — [dépôt](https://github.com/nonbili/NouTube) | **Aucun code copié** ; référence d'architecture seulement (`THIRD_PARTY_LICENSES.md`) |

### Sources
- GPL v3, art. 6 : l'« offre écrite » valable 3 ans (6 b) vise la distribution de **produits physiques** ; pour une distribution en ligne, l'option 6 d impose d'offrir la source au même endroit, ou sur un autre serveur avec des indications claires à côté du binaire. Source : [Open Source Initiative — GPL-3.0](https://opensource.org/license/gpl-3-0).
- FFmpeg rappelle que, si des éléments GPL sont utilisés, la GPL s'applique à tout FFmpeg, et recommande d'héberger la source correspondante exacte à côté du binaire ; il signale aussi un risque de brevets pour les produits commerciaux (codecs MPEG). Source : [ffmpeg.org/legal](https://ffmpeg.org/legal.html).

### Risque
Faible à moyen. L'appel de FFmpeg comme programme séparé est la pratique habituelle pour éviter l'effet « contaminant » de la GPL sur l'application. En revanche, **l'offre de source « sur demande pendant 3 ans » paraît inadaptée à une distribution par téléchargement** (option 6 b réservée aux produits physiques) et les liens vers les dépôts amont peuvent ne pas correspondre exactement à la version livrée.

### Questions précises
1. L'appel de FFmpeg (GPL v3) en ligne de commande par une application propriétaire constitue-t-il bien un « agrégat » et non une œuvre dérivée ?
2. Pour se conformer à l'option 6 d, faut-il héberger nous-mêmes l'archive source exacte de chaque build FFmpeg à côté des installeurs ? Est-ce suffisant ?
3. Faut-il reprendre dans notre fichier de licences les composants inclus dans l'exécutable yt-dlp ?
4. Risque de brevets sur les codecs (AAC, H.264) pour un produit vendu : faut-il une clause ou une version LGPL sans encodeurs brevetés ?
5. Confirmer qu'aucune obligation AGPL ne naît d'une simple inspiration d'architecture (NouTube).

### Pièces à joindre
`THIRD_PARTY_LICENSES.md`, `apps/desktop/scripts/fetch-sidecars.mjs`, `apps/desktop/electron-builder.yml`, le fichier `FFMPEG-LICENSE.txt` livré.

---

## 7. CGV

### Faits (texte actuel, `apps/site/public/cgv.html`)
- Art. 6 : rétractation de 14 jours **sans exception**, remboursement et « la licence est désactivée ». **Or la licence est vérifiée hors ligne et il n'existe aucun mécanisme de révocation** (`apps/daemon/src/license.ts` ne contrôle que la signature et la date d'expiration). Une licence « à vie » remboursée resterait donc active.
- Art. 5 : résiliation en quelques clics via le portail client Stripe ou par e-mail. Les licences mensuelles et annuelles portent une date d'expiration ; une nouvelle clé est envoyée à chaque facture payée (`apps/site/api/stripe-webhook.js`, événement `invoice.paid`).
- Art. 7 : garantie légale de conformité des contenus et services numériques (L.224-25-12 et s.).
- Art. 8 : médiateur **à compléter** ; renvoi à la plateforme européenne de règlement en ligne des litiges (RLL).

### Sources
- **Exception au droit de rétractation**, art. L.221-28 13° C. consom. (version en vigueur depuis le 28 mai 2022, ordonnance 2021-1734) : fourniture d'un contenu numérique sans support matériel dont l'exécution a commencé avant la fin du délai, sous conditions (accord exprès, renoncement exprès). Source : [traduction de l'article](https://french-business-law.com/french-legislation-art/article-l221-28-of-the-french-consumer-code) ; texte officiel à lire sur Légifrance (LEGIARTI000044563170).
- **Médiation de la consommation** : gratuite pour le consommateur, coût à la charge du professionnel ; nom, adresse et site du médiateur à afficher sur le site et dans les CGV ; amende administrative de **3 000 €** pour un entrepreneur individuel. Source : [entreprendre.service-public.gouv.fr — F33338](https://entreprendre.service-public.gouv.fr/vosdroits/F33338?profil=tout).
- **Plateforme RLL** : fermée définitivement le 20 juillet 2025. Source : [INC](https://www.inc-conso.fr/content/reglement-en-ligne-des-litiges-de-consommation-leurope-ferme-sa-plateforme-mais-des) ; règlement (UE) 2024/3228 abrogeant le règlement 524/2013. Source : [Lexis Veille](https://www.lexisveille.fr/la-plateforme-europeenne-de-reglement-en-ligne-des-litiges-est-supprimee). **Le lien de l'art. 8 doit être retiré.**

### Médiateurs proposés (à choisir)
| Médiateur | Tarif professionnel | Statut de la vérification |
| --- | --- | --- |
| **CM2C** (Centre de la médiation de la consommation de conciliateurs de justice) | Adhésion unique pour 3 ans : **48 €** jusqu'à 10 personnes ; médiation à distance : **36 €** par dossier | **Vérifié** sur [cm2c.net/tarifs.php](https://www.cm2c.net/tarifs.php) |
| **MEDCONSODEV** (ex-CNPM Médiation Consommation, nouveau nom depuis le 1er janv. 2026) | Engagement minimal 3 ans ; coût facturé à la clôture de chaque médiation recevable | Tarifs **non vérifiables** (publiés en image) : [page tarifs](https://www.medconsodev.eu/tarifs-mediationconso-art-16.html), [fiche professionnels](https://www.medconsodev.eu/PROFESSIONNELS_ce_que_vous_devez_savoir.pdf) |
| **SAS Médiation Solution** | Non publiés | **Non vérifiable** : devis à demander (contact@sasmediationsolution-conso.fr) — [site](https://sasmediationsolution-conso.fr/) |

Le Médiateur du e-commerce de la FEVAD n'est accessible qu'aux adhérents de la FEVAD. Source : [resilier.fr](https://www.resilier.fr/mediateur-fevad.php). Vérifier que le médiateur choisi est référencé par la CECMC et couvre la vente de logiciels.

### Risque
Moyen (non bloquant, mais amendes possibles et promesse d'art. 6 techniquement non tenue).

### Questions précises
1. La licence Premium est-elle un « contenu numérique » ou un « service numérique » (abonnement) ? L'exception L.221-28 13° est-elle applicable, et sous quelle forme recueillir l'accord et le renoncement exprès avec des liens de paiement Stripe (case à cocher, page intermédiaire, e-mail de confirmation) ?
2. Si l'on garde un droit de rétractation sans exception (choix commercial), comment rédiger la conséquence (pas de révocation technique possible) sans promesse inexacte ?
3. Quelles mentions précontractuelles manquent (fonctionnalités, compatibilité, interopérabilité, durée minimale, reconduction tacite, information sur le prix à vie) ?
4. Validation du médiateur choisi et rédaction de l'art. 8.

### Pièces à joindre
`apps/site/public/cgv.html`, `apps/daemon/src/license.ts`, `apps/site/api/stripe-webhook.js`, `docs/MISE-EN-PRODUCTION.md` (§ 3 Stripe).

---

## 8. RGPD

### Faits
- **Application et extension** : aucune télémétrie ; réglages, historique et bibliothèque stockés en local ; l'application contacte les sites demandés, SponsorBlock et GitHub (mise à jour du moteur) (`apps/site/public/confidentialite.html`). La règle interne n° 7 de `CLAUDE.md` impose des journaux sans URL ni donnée personnelle (non audité dans ce dossier).
- **Achat** : Stripe reçoit les données de paiement ; le webhook (hébergé sur Vercel) crée une licence signée **qui contient l'adresse e-mail et, le cas échéant, le nom de l'acheteur** (`tools/license.mjs`, `apps/site/api/stripe-webhook.js`), puis l'envoie par Resend. Aucune base de données côté KAYZEN ; le journal Vercel ne note que l'identifiant de licence.
- **Région d'exécution** : `apps/site/vercel.json` ne fixe aucune région ; les fonctions Vercel s'exécutent par défaut à Washington (`iad1`) pour les nouveaux projets. Source : [Vercel — régions](https://vercel.com/docs/functions/configuring-functions/region). La règle n° 7 de `CLAUDE.md` prévoit un « hébergement UE ».

### Sources
- **Stripe** : selon l'activité, responsable de traitement (fraude, conformité) ou sous-traitant (traitement des paiements) ; entité contractante pour l'EEE : Stripe Payments Europe Ltd (Irlande). Source : [Stripe Privacy Center](https://stripe.com/fr-ca/legal/privacy-center).
- **Resend** : participe au Data Privacy Framework UE-États-Unis ; **les données sont stockées aux États-Unis**, la région choisie ne règle que l'acheminement des e-mails ; DPA article 28 pré-signé. Source : [Resend — GDPR](https://resend.com/security/gdpr.md).
- **Vercel** : certifié au Data Privacy Framework. Source : [Vercel KB](https://vercel.com/kb/guide/is-vercel-certified-under-dpf) ; DPA : [vercel.com/legal/dpa](https://vercel.com/legal/dpa).

### Risque
Faible à moyen. Les transferts sont encadrés (DPF + clauses types), mais la politique de confidentialité ne dit pas que Resend stocke aux États-Unis, et la promesse interne « hébergement UE » n'est pas tenue en l'état.

### Questions précises
1. La politique de confidentialité actuelle est-elle complète (base légale, durées, transferts, droits, mention DPF) ? Faut-il nommer les entités exactes (Stripe Payments Europe Ltd, Resend Inc., Vercel Inc.) ?
2. Faut-il un registre des traitements pour une micro-entreprise ? Un modèle suffit-il ?
3. Inclure l'e-mail dans la clé de licence (pour dissuader le partage) est-il proportionné ? Alternative : identifiant opaque.
4. L'interrogation de SponsorBlock (4 caractères de hachage, adresse IP de l'utilisateur transmise par nature) depuis l'extension nécessite-t-elle une information ou un consentement particulier ?

### Pièces à joindre
`apps/site/public/confidentialite.html`, `apps/site/api/stripe-webhook.js`, `apps/site/vercel.json`, `tools/license.mjs`, `docs/MISE-EN-PRODUCTION.md` (§ 4 Resend, § 5 Vercel).

---

## 9. Règles des stores d'extensions

### Faits
- Extension « KAYZEN Flux — Lecture sans pub », permissions `storage`, `scripting`, `declarativeNetRequest`, `contextMenus`, `activeTab`, accès aux pages youtube.com, m.youtube.com, music.youtube.com et sponsor.ajay.app (`apps/extension/scripts/build.mjs`). Le nom et l'icône ne contiennent aucune marque tierce (règle n° 4 de `CLAUDE.md`). La fiche (`docs/STORES.md`) indique que l'extension ne télécharge rien.
- Mais l'extension ajoute sur YouTube un bouton et un menu « Envoyer vers KAYZEN Flux » qui ouvrent un **téléchargeur**.

### Sources
- **Chrome Web Store** : la violation « Blue Zinc » (produits interdits) vise l'accès non autorisé aux contenus ; motif de retrait courant cité : une extension qui facilite le téléchargement de vidéos YouTube. Source : [Chrome — troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting). Exemple de rejet de mars 2026 pour une extension qui ne téléchargeait que des miniatures et transcriptions : [groupe chromium-extensions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/K17UE-7Bjgs).
- **Edge Add-ons**, § 2.8 : l'extension ne doit pas permettre l'accès, le téléchargement ou la diffusion non autorisés de contenus protégés. Source : [Microsoft — politiques développeurs](https://learn.microsoft.com/legal/microsoft-edge/extensions/developer-policies).
- **Firefox (AMO)** : conformité au droit américain ; pas de modification inattendue du contenu web ; pas de code distant ; déclaration exacte de la collecte de données. Aucune règle propre au téléchargement trouvée dans la partie lue. Source : [Extension Workshop — Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/).

### Risque
**Élevé pour Chrome (et probablement Edge)** : rejet ou retrait probable à cause du bouton « Envoyer vers » sur YouTube, même si l'extension ne télécharge pas. Risque de suspension du compte développeur en cas de récidive.

### Questions précises
1. (Surtout décision produit.) Faut-il publier sur Chrome et Edge une version **sans** bouton ni menu « Envoyer vers » sur les sites vidéo, et réserver ce bouton à Firefox ou à une installation manuelle ?
2. Une extension de blocage publicitaire ciblant un seul site peut-elle être vue comme contraire aux conditions de ce site et donc aux règles des stores ?

### Pièces à joindre
`apps/extension/scripts/build.mjs`, `docs/STORES.md`, `docs/store-assets/`.

---

## 10. Mentions légales d'un entrepreneur individuel

### Faits (`apps/site/public/mentions-legales.html`)
Éditeur « Tarek BELHADJ, entrepreneur individuel (micro-entreprise), nom commercial KAYZEN », siège, SIRET, APE 62.01Z, TVA non applicable art. 293 B CGI, téléphone, e-mail, directeur de la publication ; hébergeur Vercel Inc. (adresse à Covina, Californie) ; registrar IONOS SE (Montabaur).

### Sources
- La mention « EI » ou « entrepreneur individuel » doit suivre immédiatement le nom sur les documents professionnels depuis le 15 mai 2022 (décret n° 2022-725 du 28 avril 2022) ; sanction jusqu'à 750 €. Source : [Superindep](https://www.superindep.fr/blog/2022/mention-ei-autoentrepreneur/) (source secondaire).
- Les éléments d'identification de l'éditeur d'un service en ligne figurent désormais à l'article 1-1 de la loi n° 2004-575 (LCEN), auquel renvoie l'article 6. Source : [Légifrance — LCEN art. 6](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000042038977).

### Risque
Faible. Le texte paraît complet ; points à vérifier : numéro d'immatriculation au registre national des entreprises (RNE) éventuellement requis, adresse officielle de Vercel Inc. (non confirmée sur une source Vercel), et l'absence du médiateur (§ 7).

### Questions précises
1. Pour une micro-entreprise libérale (BNC), faut-il indiquer une immatriculation RNE ou seulement le SIRET ?
2. La formule « Tarek BELHADJ, entrepreneur individuel » suffit-elle, ou faut-il « Tarek BELHADJ EI » partout (CGV, factures Stripe, e-mails) ?
3. Faut-il mentionner l'hébergeur des fonctions (Vercel) et le prestataire d'e-mail (Resend) ?

### Pièces à joindre
`apps/site/public/mentions-legales.html`.

---

## 11. Marque « KAYZEN Flux »

Voir `docs/VERIFICATION-NOM.md`. En résumé : aucun « KAYZEN FLUX » identique trouvé ; « Kayzen » est utilisé à Berlin par Realtime Technologies GmbH pour une plateforme logicielle publicitaire (dépôt de marque non vérifié) ; société française « KAYZEN IT » (informatique, 2023) ; nombreuses marques « KAIZEN », phonétiquement identiques. Les bases INPI, EUIPO et OMPI n'ont pas pu être lues automatiquement.

### Questions précises
1. Recherche d'antériorités complète avant dépôt (classes 9, 42, éventuellement 38 et 41) ?
2. Si une marque « KAYZEN » antérieure existe en classe 9 ou 42, le nom « KAYZEN Flux » reste-t-il utilisable, ou faut-il changer de nom avant le lancement ?

---

## 12. À décider par Tarek

1. **YouTube dans l'application** : garder, exclure, ou limiter (contenus Creative Commons / contenus de l'utilisateur), selon la réponse de l'avocat au § 2. C'est le point qui conditionne tout le reste.
2. **Communication** : retirer la comparaison avec les « convertisseurs en ligne » et mettre en avant les usages licites (sauvegarde de ses propres contenus, Creative Commons, podcasts libres de droits).
3. **Fonctions sensibles** : garder ou non les abonnements automatiques à des chaînes et les playlists illimitées.
4. **Extension** : version Chrome/Edge sans bouton « Envoyer vers » sur YouTube ; garder ou retirer la réécriture du lecteur (`inject.ts`).
5. **SponsorBlock** : demander une autorisation écrite à l'auteur, ou le retirer de l'application payante.
6. **Rétractation** : appliquer l'exception L.221-28 13° (avec accord exprès au paiement) ou garder 14 jours sans exception ; dans les deux cas, corriger la promesse « licence désactivée ».
7. **Médiateur** : CM2C (48 € pour 3 ans + 36 € par dossier, vérifié) ou autre après devis.
8. **FFmpeg** : héberger les sources exactes à côté des installeurs, ou passer à une version LGPL.
9. **Hébergement UE** : fixer la région Vercel (`regions: ["cdg1"]` ou `["fra1"]` dans `apps/site/vercel.json`) et accepter, ou non, que Resend stocke aux États-Unis.
10. **Statut** : rester en EI ou loger le produit dans une société, compte tenu du risque pénal et civil.
11. **Nom** : déposer « KAYZEN Flux » à l'INPI (310 € pour 4 classes) seulement après la recherche d'antériorités.

---

*Document préparé à partir du code au 17/11/2026. Les sources secondaires (articles, blogs de cabinets) sont signalées ; seules les décisions et textes officiels font foi.*
