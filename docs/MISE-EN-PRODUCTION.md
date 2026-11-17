# Mise en production de KAYZEN Flux — ce qu'il reste à faire de ton côté

Tout le code est prêt et testé. Les étapes ci-dessous engagent ton nom, ton argent ou des comptes à ton nom :
c'est à toi de les faire, dans cet ordre. Compte une à deux journées, hors délais de réponse de l'avocat et d'Apple.

## 0. Validation juridique (avant toute publication)

À soumettre à un avocat en propriété intellectuelle :

- [ ] Positionnement du produit (téléchargeur local, copie privée, article L.335-2-1 du CPI).
- [ ] Textes du site : `apps/site/public/mentions-legales.html`, `cgu.html`, `cgv.html`, `confidentialite.html`.
- [ ] **SponsorBlock** : ses données sont sous licence CC BY-NC-SA (pas d'usage commercial). Option possible : ne proposer SponsorBlock que dans la version gratuite, ou demander une autorisation à son auteur.
- [ ] **FFmpeg** livré en version GPL (seule disponible chez la source utilisée), comme programme séparé appelé en ligne de commande. Vérifier l'analyse et l'offre de code source (`THIRD_PARTY_LICENSES.md`).
- [ ] Choisir un **médiateur de la consommation** (obligatoire pour vendre à des particuliers) et compléter l'article 8 des CGV.

## 1. Clé de licence de production (5 minutes)

```bash
node tools/license.mjs keygen
```

- Crée `keys/private.pem` : **sauvegarde-le hors ligne en deux exemplaires** (clé USB + gestionnaire de mots de passe). Ne le commite jamais (il est déjà exclu par `.gitignore`).
- Met à jour `apps/daemon/src/license-key.ts` avec la clé publique. Le build de distribution refuse de partir tant que la clé de développement est présente.
- Émettre une licence à la main (cadeau, support) : `node tools/license.mjs issue client@exemple.fr --name "Nom" --days 370` (sans `--days` : à vie).

## 2. Dépôt GitHub et installeurs — FAIT (17/11/2026)

- Dépôt privé : https://github.com/kayzen-lyon/kayzenflux (l'ancien dépôt kayzenlyon-ai n'est plus utilisé).
- **À refaire** : les installeurs du brouillon v1.0.0 étaient dans l'ancien dépôt et utilisaient Electron 33. Relancer *Actions > release* sur le nouveau dépôt (Electron 45).
- La chaîne GitHub Actions (`.github/workflows/release.yml`) teste puis fabrique Windows (.exe), macOS Apple Silicon et Intel (.dmg), Linux (.AppImage, .deb) et l'extension, et dépose le tout dans un **brouillon de version**.
- Nouvelle version : augmenter `version` dans `apps/desktop/package.json` (et `apps/extension/package.json`), pousser, puis *Actions > release > Run workflow* (ou pousser une étiquette `vX.Y.Z`).
- La clé publique de production est dans le dépôt : aucun secret n'est obligatoire.
- Signature (recommandée, sinon avertissements Windows SmartScreen / macOS Gatekeeper) : ajouter les secrets `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` (certificat Windows), `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (Apple Developer Program). Ils sont pris en compte automatiquement.
- Le dépôt étant privé, ses fichiers de version ne sont pas téléchargeables par le public : pour le site, publier les installeurs dans un dépôt public dédié (ex. `kayzen-lyon/kayzenflux-releases`) ou un stockage public, puis renseigner les liens dans `apps/site/public/assets/config.js`.

## 2 bis. Mises à jour automatiques de l'application

L'application demande l'accord de l'utilisateur au premier lancement (rien n'est vérifié sans réponse), puis vérifie au démarrage et toutes les 6 h, télécharge en arrière-plan et propose « Redémarrer pour installer » (jamais imposé ; sinon installation à la fermeture). Bouton « Rechercher maintenant » dans *Moteur & Paramètres*.

- **Adresse** : `publish.url` dans `apps/desktop/electron-builder.yml`, par défaut `https://flux.kayzen-lyon.com/updates/` (https obligatoire). Autre adresse pour un build : `electron-builder … -c.publish.url=https://exemple.fr/maj/`. Désactivation sur un poste : variable `KAYZEN_DISABLE_UPDATES=1`.
- **Fichiers à déposer** dans ce dossier, pour chaque version, depuis `apps/desktop/release/` (ils sont dans les artefacts de la CI) :
  - Windows : `latest.yml`, `kayzen-flux-X.Y.Z-win-x64.exe` et son `.blockmap` ;
  - macOS : `latest-mac.yml`, les `.zip` (arm64 et x64) et leurs `.blockmap` (le `.zip` est indispensable, le `.dmg` ne sert qu'à la première installation) ;
  - Linux : `latest-linux.yml` et l'`.AppImage`. Le paquet `.deb` ne se met **pas** à jour seul : l'application renvoie vers la page de téléchargement.
  - Déposer les installeurs **avant** les `latest*.yml` (sinon les clients voient une version introuvable).
- **Hébergement** : le site Vercel est encore protégé (accès réservé) : tant que la protection est active, les vérifications échouent. Les installeurs (> 100 Mo) peuvent dépasser les limites de fichiers de Vercel : on peut ne laisser que les `latest*.yml` sur le site et rediriger les autres fichiers (redirection 302 dans `vercel.json`) vers un stockage public situé dans l'UE ; electron-updater suit les redirections.
- **Sécurité** : electron-updater vérifie l'empreinte **sha512** annoncée dans `latest*.yml` avant d'installer. Cela détecte un fichier corrompu, mais pas un serveur compromis (qui changerait aussi le `.yml`) : seule la **signature de code** (Windows, et macOS où elle est obligatoire pour la mise à jour) garantit l'origine. Signer les versions avant d'ouvrir les mises à jour au public.
- **Confidentialité** : aucune donnée personnelle envoyée ; l'identifiant aléatoire qu'electron-updater ajoute normalement à chaque requête est remplacé par une valeur identique pour tous. Le serveur voit l'adresse IP et la version (en-tête User-Agent) : limiter la conservation des journaux d'accès.

## 3. Paiement (Stripe)

1. Crée les produits : **Premium mensuel** 3,99 € (récurrent), **Premium annuel** 29 € (récurrent), **Premium à vie** 59 € (paiement unique).
2. Pour chacun, crée un **lien de paiement** avec la redirection après paiement vers `https://flux.kayzen-lyon.com/merci`.
3. Active le **portail client** (résiliation en quelques clics, exigée par la loi).
4. Ajoute un webhook vers `https://flux.kayzen-lyon.com/api/stripe-webhook` avec les événements `checkout.session.completed` et `invoice.paid`. Copie le secret `whsec_…`.
5. Renseigne les trois liens dans `apps/site/public/assets/config.js`.
6. Si tu changes les prix, mets à jour la variable `PLAN_BY_AMOUNT` (montants en centimes), par exemple `{"399":"monthly","2900":"yearly","5900":"lifetime"}`.

## 4. Envoi des licences par e-mail (Resend)

1. Crée un compte sur https://resend.com, puis *Domains > Add domain* : `kayzen-lyon.fr`, région Europe (Irlande).
2. Resend affiche 3 ou 4 enregistrements DNS (MX et TXT pour l'envoi, TXT DKIM `resend._domainkey`, TXT DMARC conseillé). Ajoute-les chez IONOS (*Domaines & SSL > kayzen-lyon.fr > DNS*), **sans toucher à tes enregistrements MX existants** : ceux de Resend portent sur le sous-domaine `send`.
3. Attends que le domaine passe à « Verified » (quelques minutes à quelques heures).
4. *API Keys > Create* : droit « Sending access », domaine `kayzen-lyon.fr`.
5. Test réel depuis le dossier du projet (envoie une licence de test de 35 jours à ton adresse) :
   ```bash
   RESEND_API_KEY=re_xxx MAIL_FROM="KAYZEN Flux <licences@kayzen-lyon.fr>" node tools/test-mail.mjs tarek@ton-adresse.fr
   ```

## 5. Site (Vercel) — EN LIGNE, PROTÉGÉ (17/11/2026)

1. FAIT : projet Vercel `kayzenflux`, dossier racine `apps/site`, déploiement automatique à chaque envoi sur `main`. Accès réservé au compte Vercel (protection « All Deployments ») et en-tête `noindex` : retirer les deux au lancement.
2. Variables d'environnement : `STRIPE_WEBHOOK_SECRET`, `KAYZEN_LICENSE_PRIVATE_KEY` (contenu complet de `keys/private.pem`), `RESEND_API_KEY`, `MAIL_FROM` (ex. `KAYZEN Flux <licences@kayzen-lyon.fr>`).
3. Domaine `flux.kayzen-lyon.com` : enregistrement CNAME chez IONOS vers la cible indiquée par Vercel.
4. Test de bout en bout en mode test Stripe : achat → e-mail reçu → clé collée dans l'application → Premium actif.

## 6. Extension

Fiches complètes, justifications des autorisations et visuels : **`docs/STORES.md`** et `docs/store-assets/`.

- **Chrome Web Store** (compte développeur payant, frais unique) : téléverse `kayzen-flux-extension-chromium-1.0.0.zip`. Déclarations : aucune donnée collectée ; justification de chaque permission (`storage` réglages, `scripting` lecture sans pub, `declarativeNetRequest` blocage des publicités, `contextMenus` menu « Envoyer vers », `activeTab` envoi de la page courante, accès aux sites vidéo et à `sponsor.ajay.app`).
- **Firefox Add-ons** (gratuit) : `kayzen-flux-extension-firefox-1.0.0.zip`.
- **Edge Add-ons** (gratuit) : même archive que Chrome.
- Renseigne ensuite les liens des stores dans `config.js`.

## 7. Avant d'annoncer le lancement

- [ ] Tester sur une vraie machine Windows, Mac et Linux : installation, lien depuis l'extension, téléchargement réel (audio et vidéo), abonnement à une chaîne, mise à jour du moteur.
- [ ] Tester l'extension sur les vrais sites vidéo (le blocage des publicités dépend de sites qui changent souvent : prévoir des mises à jour régulières).
- [ ] Vérifier les adresses de l'hébergeur et du registrar dans les mentions légales.
- [ ] Retirer le commentaire « MODÈLE À FAIRE VALIDER » en tête des pages légales une fois validées.
