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

## 2. Dépôt GitHub et installeurs

1. Crée un dépôt **privé** `kayzen-lyon/kayzen-flux` et pousse le code.
2. Dans *Settings > Secrets and variables > Actions*, ajoute `KAYZEN_LICENSE_PUBLIC_KEY_TS` (contenu complet de `apps/daemon/src/license-key.ts`).
3. Signature (recommandé, sinon Windows et macOS affichent des avertissements) :
   - Windows : certificat de signature de code → secrets `WIN_CSC_LINK` (fichier .pfx en base64) et `WIN_CSC_KEY_PASSWORD`.
   - macOS : Apple Developer Program → certificat « Developer ID Application » (`CSC_LINK`, `CSC_KEY_PASSWORD`) + notarisation (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).
4. Crée l'étiquette `v1.0.0` : la CI lance les tests, construit Windows (.exe), macOS (.dmg), Linux (.AppImage, .deb) et l'extension, puis prépare un **brouillon** de version. Relis-le, puis publie-le.
5. Les installeurs doivent être téléchargeables publiquement : publie-les dans les « Releases » d'un dépôt public dédié (ex. `kayzen-lyon/kayzen-flux-releases`) ou sur un stockage public, puis renseigne les liens dans `apps/site/public/assets/config.js`.

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

## 5. Site (Vercel)

1. Nouveau projet Vercel depuis le dépôt, **dossier racine `apps/site`**.
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
