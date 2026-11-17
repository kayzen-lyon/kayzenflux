# Publication de l'extension — fiches prêtes à copier

Fichiers à téléverser (produits par `pnpm --filter @kayzen-flux/extension package`) :

| Store | Archive | Compte |
| --- | --- | --- |
| Chrome Web Store | `apps/extension/release/kayzen-flux-extension-chromium-1.0.0.zip` | https://chrome.google.com/webstore/devconsole (frais d'inscription unique) |
| Microsoft Edge Add-ons | même archive que Chrome | https://partner.microsoft.com/dashboard/microsoftedge (gratuit) |
| Firefox Add-ons | `apps/extension/release/kayzen-flux-extension-firefox-1.0.0.zip` | https://addons.mozilla.org/developers (gratuit) |

Visuels : dossier `docs/store-assets/`.

| Fichier | Usage |
| --- | --- |
| `icone-128.png` | Icône du store |
| `capture-1-sans-pub-1280x800.png`, `capture-2-sponsorblock-1280x800.png`, `capture-3-envoyer-1280x800.png` | Captures d'écran (Chrome, Edge, Firefox) |
| `tuile-promo-440x280.png` | Petite vignette promotionnelle (Chrome, Edge) |
| `banniere-1400x560.png` | Bannière « marquee » (Chrome, facultative) |

Prérequis : la page `https://flux.kayzen-lyon.com/confidentialite` doit être en ligne (URL de politique de confidentialité demandée par les trois stores).

**Prix** : gratuit partout, sans achat intégré, sans formule payante ni publicité. KAYZEN Flux est open source sous licence MIT (https://github.com/kayzen-lyon/kayzenflux).

---

## Textes de la fiche

**Nom** : KAYZEN Flux — Lecture sans pub

**Résumé (132 caractères max)** :
Lecture vidéo sans publicité, segments sponsorisés sautés et envoi vers l'application KAYZEN Flux. Aucune donnée collectée.

**Catégorie** : Productivité (Chrome) · Lecteurs et vidéos / Confidentialité et sécurité (Firefox)

**Langue** : français

**Description** :

```
Regardez vos vidéos sans interruption.

KAYZEN Flux — Lecture sans pub retire les publicités pendant la lecture, saute automatiquement les passages sponsorisés et vous permet d'envoyer une vidéo vers l'application de bureau KAYZEN Flux en un clic.

CE QUE FAIT L'EXTENSION
• Bloque les publicités vidéo et les emplacements publicitaires des pages de lecture.
• Saute les segments sponsorisés, autopromotions et rappels d'abonnement grâce à la base communautaire SponsorBlock. Vous choisissez les catégories à passer.
• Masque les Shorts si vous le souhaitez.
• Ajoute un bouton « Envoyer vers KAYZEN Flux » et un menu clic droit qui ouvrent l'application de bureau avec le lien déjà rempli.

RESPECT DE LA VIE PRIVÉE
• Aucune donnée personnelle n'est collectée ni transmise à KAYZEN.
• Réglages et compteurs restent dans votre navigateur.
• Pour SponsorBlock, seuls 4 caractères d'une empreinte de l'identifiant de la vidéo sont envoyés : impossible de savoir ce que vous regardez.

IMPORTANT
L'extension ne télécharge aucun contenu. Le téléchargement et la conversion se font, si vous le souhaitez, dans l'application de bureau KAYZEN Flux, pour des contenus que vous avez le droit de copier.

Gratuit et open source (licence MIT) : https://github.com/kayzen-lyon/kayzenflux
Éditeur : KAYZEN (Lyon, France) — contact@kayzen-lyon.fr
Données de segments : SponsorBlock (sponsor.ajay.app, Ajay Ramachandran et contributeurs), licence CC BY-NC-SA 4.0, usage non commercial.
Les noms de plateformes cités appartiennent à leurs propriétaires ; KAYZEN Flux n'est affilié à aucune d'elles.
```

**Site web** : https://flux.kayzen-lyon.com
**Assistance** : contact@kayzen-lyon.fr
**Politique de confidentialité** : https://flux.kayzen-lyon.com/confidentialite

---

## Onglet « Confidentialité » du Chrome Web Store

**Objectif unique** :
Améliorer la lecture de vidéos en ligne : retirer les publicités, sauter les segments sponsorisés et permettre d'ouvrir la vidéo dans l'application de bureau KAYZEN Flux.

**Justification des autorisations** :

| Autorisation | Justification |
| --- | --- |
| `storage` | Enregistrer les réglages de l'utilisateur (options activées, catégories de segments) et les compteurs locaux. |
| `scripting` | Injecter, uniquement sur les pages de lecture vidéo, le script qui retire les données publicitaires du lecteur, et ouvrir le lien vers l'application depuis l'onglet courant. |
| `declarativeNetRequest` | Bloquer les requêtes réseau publicitaires (liste de règles statique incluse dans l'extension). |
| `contextMenus` | Ajouter l'entrée « Envoyer vers KAYZEN Flux » au menu du clic droit. |
| `activeTab` | Lire l'adresse de l'onglet actif uniquement quand l'utilisateur clique sur « Envoyer cette page vers KAYZEN Flux ». |
| Accès aux sites vidéo (`youtube.com`, `music.youtube.com`) | Masquer les publicités, sauter les segments et afficher le bouton sur ces pages. |
| Accès à `sponsor.ajay.app` | Interroger la base communautaire SponsorBlock pour connaître les segments à sauter. |
| Code distant | Non : tout le code est inclus dans l'extension. |

**Utilisation des données** : cocher « Ne collecte aucune donnée utilisateur ». Certifier les trois engagements (pas de vente, pas d'usage sans rapport, pas d'évaluation de solvabilité).

## Firefox Add-ons

- **Code source** : AMO peut demander les sources si le code est minifié. Le build n'est pas minifié ; en cas de demande, téléverser l'archive du dépôt avec la commande `pnpm install && pnpm --filter @kayzen-flux/extension build`.
- **Collecte de données** : « aucune » (déjà déclarée dans le manifeste, `data_collection_permissions: none`).
- **Licence** : « MIT License ».
- **Code source** : lien vers https://github.com/kayzen-lyon/kayzenflux.

## Microsoft Store (application de bureau Windows)

- Inscription **gratuite** pour les développeurs individuels (compte Partner Center, https://partner.microsoft.com/dashboard). Le Store signe les paquets qu'il distribue.
- Type de produit : application (installeur `.exe` hébergé sur https://telechargements.kayzen-lyon.com/ ou paquet MSIX).
- **Prix** : gratuit ; aucun achat intégré ni formule payante.
- Description : reprendre celle du site, en précisant « usage personnel, pour des contenus que vous avez le droit de copier ; contenus protégés par DRM refusés ».
- Politique de confidentialité : https://flux.kayzen-lyon.com/confidentialite.

## Points de vigilance à l'examen

- Ne jamais présenter l'extension comme un outil de téléchargement : elle n'en est pas un, et le Chrome Web Store refuse les extensions qui téléchargent depuis les sites vidéo.
- Ne pas utiliser de logo ni de nom de plateforme dans l'icône, le titre ou les visuels.
- L'examen prend en général de quelques jours à quelques semaines. En cas de refus, le motif est indiqué : il suffit souvent d'ajuster la description ou une justification.
