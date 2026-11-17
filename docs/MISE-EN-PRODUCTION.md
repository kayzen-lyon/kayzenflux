# Mise en production de KAYZEN Flux — ce qu'il reste à faire de ton côté

KAYZEN Flux est **entièrement gratuit et open source (licence MIT)** : plus de vente, plus de paiement, plus de clé de licence.
Les étapes ci-dessous engagent ton nom ou des comptes à ton nom : c'est à toi de les faire, dans cet ordre.

## 0. Validation juridique (avant toute publication)

À soumettre à un avocat en propriété intellectuelle :

- [ ] Positionnement du produit (téléchargeur local, copie privée, article L.335-2-1 du CPI).
- [ ] Textes du site : `apps/site/public/mentions-legales.html`, `cgu.html`, `confidentialite.html` (les CGV ont été supprimées : rien n'est vendu).
- [ ] **SponsorBlock** : données sous licence CC BY-NC-SA 4.0. L'application étant gratuite, sans publicité ni offre payante, l'usage est non commercial ; l'attribution figure dans `THIRD_PARTY_LICENSES.md` et dans la fenêtre de l'extension. Toute monétisation future imposerait de réexaminer ce point.
- [ ] **FFmpeg** livré en version GPL (seule disponible chez la source utilisée), comme programme séparé appelé en ligne de commande. Vérifier l'analyse et l'offre de code source (`THIRD_PARTY_LICENSES.md`).

## 1. Dépôt GitHub et installeurs

- Dépôt **public** : https://github.com/kayzen-lyon/kayzenflux, licence MIT (fichier `LICENSE`). L'ancien dépôt kayzenlyon-ai n'est plus utilisé.
- **À refaire** : les installeurs du brouillon v1.0.0 étaient dans l'ancien dépôt et utilisaient Electron 33. Relancer *Actions > release* sur le nouveau dépôt (Electron 45).
- La chaîne GitHub Actions (`.github/workflows/release.yml`) teste puis fabrique Windows (.exe), macOS Apple Silicon et Intel (.dmg), Linux (.AppImage, .deb) et l'extension, et dépose le tout dans un **brouillon de version**.
- Nouvelle version : augmenter `version` dans `apps/desktop/package.json` (et `apps/extension/package.json`), pousser, puis *Actions > release > Run workflow* (ou pousser une étiquette `vX.Y.Z`).
- Aucun secret n'est obligatoire : sans certificat, les installeurs sont produits mais non signés.
- Signature (recommandée, sinon avertissements Windows SmartScreen / macOS Gatekeeper) : ajouter les secrets `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` (certificat Windows), `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (Apple Developer Program). Ils sont pris en compte automatiquement.
- **Signature Windows gratuite** : la [SignPath Foundation](https://signpath.org) signe gratuitement les projets open source (licence reconnue par l'OSI, comme MIT). Candidater sur https://signpath.org avec le dépôt public ; une fois accepté, la signature se fait depuis GitHub Actions via leur action officielle (requête de signature sur l'artefact Windows produit par la CI), à ajouter au job `desktop` de `release.yml`. Conditions à vérifier au moment de la demande (projet actif, construction reproductible sur la CI, aucun composant propriétaire).
- **Microsoft Store** : l'inscription est gratuite pour les développeurs individuels (compte Partner Center). Le Store signe lui-même les paquets qu'il distribue, ce qui supprime l'avertissement SmartScreen pour les utilisateurs qui passent par lui. Fiche et règles : voir `docs/STORES.md`.

## 2. Hébergement des installeurs (IONOS)

- Les installeurs publics sont hébergés chez **IONOS** sur **https://telechargements.kayzen-lyon.com/** (sous-domaine de `kayzen-lyon.com`, certificat TLS actif obligatoire).
- Déposer pour chaque version les fichiers de `apps/desktop/release/` (artefacts de la CI) : `.exe`, `.dmg`, `.zip` macOS, `.AppImage`, `.deb`, et les archives de l'extension.
- Renseigner ensuite les liens publics dans `apps/site/public/assets/config.js` (rubrique `downloads`).
- Limiter la conservation des journaux d'accès IONOS (adresse IP) au strict nécessaire : la politique de confidentialité mentionne cet hébergement.

## 2 bis. Mises à jour automatiques de l'application

L'application demande l'accord de l'utilisateur au premier lancement (rien n'est vérifié sans réponse), puis vérifie au démarrage et toutes les 6 h, télécharge en arrière-plan et propose « Redémarrer pour installer » (jamais imposé ; sinon installation à la fermeture). Bouton « Rechercher maintenant » dans *Moteur & Paramètres*.

- **Adresse** : `publish.url` dans `apps/desktop/electron-builder.yml`, par défaut `https://flux.kayzen-lyon.com/updates/` (https obligatoire). Autre adresse pour un build : `electron-builder … -c.publish.url=https://exemple.fr/maj/`. Désactivation sur un poste : variable `KAYZEN_DISABLE_UPDATES=1`.
- **Fichiers à déposer** dans ce dossier, pour chaque version, depuis `apps/desktop/release/` (ils sont dans les artefacts de la CI) :
  - Windows : `latest.yml`, `kayzen-flux-X.Y.Z-win-x64.exe` et son `.blockmap` ;
  - macOS : `latest-mac.yml`, les `.zip` (arm64 et x64) et leurs `.blockmap` (le `.zip` est indispensable, le `.dmg` ne sert qu'à la première installation) ;
  - Linux : `latest-linux.yml` et l'`.AppImage`. Le paquet `.deb` ne se met **pas** à jour seul : l'application renvoie vers la page de téléchargement.
  - Déposer les installeurs **avant** les `latest*.yml` (sinon les clients voient une version introuvable).
- **Hébergement** : le plus simple est de tout servir depuis IONOS, par exemple `https://telechargements.kayzen-lyon.com/updates/` (changer `publish.url` dans `electron-builder.yml` ou passer `-c.publish.url=…`). Si l'adresse reste sur le site Vercel, celui-ci ne doit plus être protégé, et les gros fichiers peuvent être redirigés (302, `vercel.json`) vers IONOS ; electron-updater suit les redirections.
- **Sécurité** : electron-updater vérifie l'empreinte **sha512** annoncée dans `latest*.yml` avant d'installer. Cela détecte un fichier corrompu, mais pas un serveur compromis (qui changerait aussi le `.yml`) : seule la **signature de code** (Windows, et macOS où elle est obligatoire pour la mise à jour) garantit l'origine. Signer les versions avant d'ouvrir les mises à jour au public.
- **Confidentialité** : aucune donnée personnelle envoyée ; l'identifiant aléatoire qu'electron-updater ajoute normalement à chaque requête est remplacé par une valeur identique pour tous. Le serveur voit l'adresse IP et la version (en-tête User-Agent) : limiter la conservation des journaux d'accès.

## 3. Site (Vercel) — EN LIGNE, PROTÉGÉ (17/11/2026)

1. FAIT : projet Vercel `kayzenflux`, dossier racine `apps/site`, déploiement automatique à chaque envoi sur `main`. Accès réservé au compte Vercel (protection « All Deployments ») et en-tête `noindex` : retirer les deux au lancement.
2. Site 100 % statique : plus aucune fonction serveur ni variable d'environnement. **Supprimer** dans Vercel les anciennes variables `STRIPE_WEBHOOK_SECRET`, `KAYZEN_LICENSE_PRIVATE_KEY`, `RESEND_API_KEY`, `MAIL_FROM` si elles existent, puis désactiver le webhook et les liens de paiement Stripe et le domaine d'envoi Resend s'ils avaient été créés.
3. Domaine `flux.kayzen-lyon.com` : enregistrement CNAME chez IONOS vers la cible indiquée par Vercel.
4. L'ancienne clé privée de licence (`keys/private.pem`) ne sert plus : la conserver hors ligne ou la détruire, mais ne jamais la publier.

## 4. Extension

Fiches complètes, justifications des autorisations et visuels : **`docs/STORES.md`** et `docs/store-assets/`.

- **Chrome Web Store** (compte développeur payant, frais unique) : téléverse `kayzen-flux-extension-chromium-1.0.0.zip`. Déclarations : aucune donnée collectée ; justification de chaque permission (`storage` réglages, `scripting` lecture sans pub, `declarativeNetRequest` blocage des publicités, `contextMenus` menu « Envoyer vers », `activeTab` envoi de la page courante, accès aux sites vidéo et à `sponsor.ajay.app`).
- **Firefox Add-ons** (gratuit) : `kayzen-flux-extension-firefox-1.0.0.zip`.
- **Edge Add-ons** (gratuit) : même archive que Chrome.
- Renseigne ensuite les liens des stores dans `config.js`.

## 5. Avant d'annoncer le lancement

- [ ] Tester sur une vraie machine Windows, Mac et Linux : installation, lien depuis l'extension, téléchargement réel (audio et vidéo), abonnement à une chaîne, mise à jour du moteur.
- [ ] Tester l'extension sur les vrais sites vidéo (le blocage des publicités dépend de sites qui changent souvent : prévoir des mises à jour régulières).
- [ ] Vérifier les adresses des hébergeurs (Vercel, IONOS) et du registrar dans les mentions légales.
- [ ] Retirer le commentaire « MODÈLE À FAIRE VALIDER » en tête des pages légales une fois validées.
