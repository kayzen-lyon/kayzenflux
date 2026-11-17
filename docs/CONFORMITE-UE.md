# Conformité européenne du site vitrine KAYZEN Flux

> Document produit avec l'aide d'une IA, en appliquant le skill `eu-web-compliance` v1.1.2 (faits réglementaires vérifiés au 2026-11-14). **Ce n'est ni un audit d'accessibilité, ni un avis juridique, ni une attestation de conformité.** Les verdicts portent sur un critère, jamais sur le site entier. Les textes juridiques du site restent des **MODÈLES À FAIRE VALIDER** par l'éditeur (et par un avocat) avant publication.

- **Périmètre** : `apps/site/public` (index, installer-extension, mentions-legales, cgu, confidentialite, `assets/style.css`, `assets/config.js`) et `apps/site/vercel.json`.
- **Date** : 17 novembre 2026. Branche `feat/compliance`.
- **Verdicts** : C conforme, NC non conforme, NA non applicable, NT non testé. **Gravité** : bloquant, majeur, mineur.
- **Méthode** (modes Scope → Verify → Build → Document du skill) :
  1. Profil `apps/site/compliance/profile.json` (réponses `stated` / `inferred` / `assumed`), matrice `apps/site/compliance/applicability-matrix.md` (`scripts/applicability.py`).
  2. Vérificateurs du skill (`scripts/check-all.mjs`, axe-core + Playwright) : sur le dossier `public/` (accessibilité, 5 pages) et sur un serveur local qui émule `vercel.json` (`cleanUrls` + en-têtes) pour les en-têtes réellement servis, page par page. Rapport final : `apps/site/compliance/reports/compliance-report-2026-11-17.md`.
  3. Revue manuelle du code (contrastes calculés, structure, textes légaux) et rendus Chrome sans interface à 375 et 1280 px.

## 0. Cas d'arrêt et points bloquants

| Point | Statut |
|---|---|
| Cas d'arrêt du skill : « public incluant des mineurs » non exclu (`audience.includes_minors` sans réponse). Le site ne collecte aucune donnée sur formulaire et ne fait aucun profilage : aucune fonction concernée n'a été construite. **À confirmer par l'éditeur** (le logiciel s'adresse-t-il aussi aux mineurs ?) ; sinon consulter un professionnel de la protection des données. | NT |
| Aucune non-conformité bloquante trouvée par les vérificateurs après corrections. | — |

## 1. Applicabilité (résumé de la matrice)

- **Requis pour cet éditeur** : mentions légales LCEN art. 1-1 `[fr-lcen]` ; RGPD information (art. 12 à 14), droits (art. 15 à 22), protection dès la conception (art. 25), sous-traitants (art. 28), violations (art. 33-34), sécurité du traitement (art. 32) ; « pas de traceur avant consentement » (aucun traceur présent).
- **Recommandé** : base WCAG 2.2 AA du skill ; en-têtes de sécurité ANSSI ; OWASP Top 10 ; revue du code généré par IA (ANSSI).
- **À confirmer** (traité comme applicable jusqu'à confirmation) : obligations RGAA de l'article 47 de la loi 2005-102 (déclaration, schéma pluriannuel, mention en page d'accueil) — ne visent que les organismes publics et les entreprises dont le chiffre d'affaires France moyen dépasse 250 M€ ; le chiffre d'affaires n'a pas été déclaré, donc `to-confirm` ; transferts hors UE (Vercel Inc., États-Unis) ; consentement des mineurs ; identification du prestataire (directive 2000/31/CE art. 5, l'activité « commerciale » étant supposée).
- **Non applicable** (faits déclarés : gratuit, aucun paiement, aucun compte, aucun contenu utilisateur) : EAA (aucun contrat de consommation conclu sur le site — qualification à confirmer par un juriste), bouton de commande, droit et fonction de rétractation, médiateur de la consommation, annonces de réduction de prix, CGV, DSA, AI Act article 50 (aucune fonction IA sur le site ; la transcription Whisper/Ollama est dans l'application, hors périmètre).

## 2. RGPD / ePrivacy

| Point | Statut | Preuve | Correction |
|---|---|---|---|
| Aucun traceur, cookie ni stockage avant consentement `[GDPR art. 6]` `[CNIL guidelines]` | C | Vérificateur privacy : 0 cookie, 0 requête tierce, 0 écriture de stockage ; `config.js` n'écrit rien ; CSP `script-src 'self'`, `connect-src 'self'` | — (pas de bandeau nécessaire, aucun traceur) |
| Polices auto-hébergées, aucune ressource tierce `[GDPR art. 44]` | C | `assets/*.woff2`, `font-src 'self'` ; test `compliance.test.js` | — |
| Information : responsable, finalités, droits, CNIL `[GDPR art. 13]` | C | `confidentialite.html` §1, §5, §6 | — |
| Durée de conservation des journaux d'hébergement `[GDPR art. 13(2)(a)]` | NC mineur | `confidentialite.html` §2 disait « pour une durée limitée » | **Appliquée** : placeholder visible `[durée de conservation des journaux à confirmer auprès de l'hébergeur]` — à compléter |
| Base légale des journaux techniques `[GDPR art. 13(1)(c)]` | NC mineur | `confidentialite.html` §2 : absente | **Appliquée** : placeholder `[base légale à confirmer par l'éditeur]` |
| Garantie des transferts hors UE (Vercel Inc.) `[GDPR art. 44-49]` | NT | `confidentialite.html` §5 affirmait des clauses contractuelles types sans preuve | **Appliquée** : placeholder `[mécanisme de transfert … à confirmer par l'éditeur d'après le contrat de l'hébergeur]` (règle 7 du skill : ne jamais inventer une garantie) |
| Base légale « intérêt légitime » et conservation « 3 ans » des e-mails | NT | `confidentialite.html` §5 | À confirmer par l'éditeur (non modifié) |
| Contrats de sous-traitance Vercel / IONOS `[GDPR art. 28]` | NT | — | À faire : vérifier l'acceptation des DPA des deux hébergeurs |
| Région d'exécution UE | C | `vercel.json` `"regions": ["fra1"]` | — (journaux et société mère restent aux États-Unis : voir ligne transferts) |

## 3. LCEN — mentions légales

| Point | Statut | Preuve | Correction |
|---|---|---|---|
| Éditeur personne physique : nom, adresse, téléphone, e-mail `[fr-lcen art. 1-1]` | C | `mentions-legales.html` bloc « Éditeur » | Téléphone rendu cliquable (`tel:`) |
| Numéro d'immatriculation (si immatriculé) | NT | absent | **Appliquée** : ligne « Immatriculation » avec placeholder à compléter par l'éditeur (le SIRET n'est pas un numéro d'immatriculation) |
| Directeur de la publication | C | `mentions-legales.html` | — |
| Hébergeur : nom, adresse **et téléphone** `[fr-lcen art. 1-1]` | NC majeur | téléphones de Vercel et d'IONOS absents | **Appliquée** : placeholders `[numéro de téléphone de l'hébergeur, à compléter par l'éditeur]` (non inventés). L'adresse de Vercel est à revérifier sur son site |
| Lien vers la politique de confidentialité | NC mineur | absent | **Appliquée** : section « Données personnelles » |
| Mention TVA (art. 293 B CGI), APE | C (information fournie par l'éditeur) | `mentions-legales.html` | — |
| Lien « Mentions légales » sur toutes les pages | C | pied de page des 5 pages ; test `compliance.test.js` | — |
| Pas de lien vers l'ancienne plateforme RLL européenne `[con-no-odr-link]` | C | aucun lien | — |

## 4. Accessibilité (RGAA 4.1.2 / WCAG 2.1 AA ; cible du skill WCAG 2.2 AA)

Vérificateur a11y (axe-core + règles du skill) sur 5 pages : **0 NC** ; 165 points « à revoir » (NT), détaillés ci-dessous.

| Point | Statut | Preuve | Correction |
|---|---|---|---|
| Langue de page `lang="fr"` `[WCAG 3.1.1]` `[RGAA 8.3]` | C | 5 pages, ligne 2 | — |
| Lien d'évitement + `main#contenu` `[WCAG 2.4.1]` `[RGAA 12.7]` | C | `.skip` sur les 5 pages | — |
| Titres de page, hiérarchie h1→h2→h3 `[WCAG 2.4.2, 1.3.1]` | C | revue du code | — |
| Alternatives des images ; logo décoratif `alt=""` à côté du texte | C (pertinence : NT humain) | `index.html` l. 28, 53, 105, 144 | — |
| Tableau comparatif : `th scope`, région focalisable nommée `[WCAG 1.3.1]` | C | `index.html` l. 113-126 | — |
| Contrastes `[WCAG 1.4.3]` | C (calculé) | texte #3b4656/crème 8,4:1 ; #9fb0c4/marine 7,3:1 ; bouton blanc/#b5451b 5,5:1 ; liens #8f3413/crème 6,9:1. axe laissait 6 points NT sur `.route-line` (pseudo-éléments) : couleurs marine/crème = 14,2:1 | — |
| Focus visible `[WCAG 2.4.7]` | C | `style.css` `:focus-visible` 3 px, variante sur fond sombre | — |
| Focus masqué par l'en-tête collant `[WCAG 2.4.11]` (2.2 AA) | NC majeur → corrigé | `.top { position: sticky }` ; règle AP-KBD-08 sur 5 pages | **Appliquée** : `html { scroll-padding-top: 88px }` dans `style.css` ; le point a disparu à la nouvelle vérification |
| Liens `data-link` avec `href="#"` avant exécution du script (AP-ARIA-02) | NT mineur | `index.html` l. 179-204, `installer-extension.html` l. 23, 34, 43 | À faire (hors design) : mettre l'URL réelle dans le HTML, `config.js` restant une surcouche ; sans JavaScript, les liens ne mènent nulle part |
| Tailles de police en px (AP-VIS-08) | NT `[best practice]` | `style.css` | Non modifié (design) ; le zoom navigateur à 200 % reste à tester à la main `[WCAG 1.4.4]` |
| Reflow 320 px, ordre visuel/DOM (AP-VIS-06, AP-STR-15) | NT | rendus 375 px sans défilement horizontal | Test manuel à 320 px et au clavier à faire |
| Vérifications humaines : pertinence des alternatives, ordre du focus, lecteur d'écran (NVDA/VoiceOver), espacement du texte `[WCAG 1.4.12]` | NT | — | À faire par une personne (`references/accessibility/testing-by-hand.md`) |
| Déclaration d'accessibilité RGAA | NT (`to-confirm`) | Art. 47 : uniquement au-delà de 250 M€ de CA France ou organisme public | Non publiée : le skill demande, pour une ligne `to-confirm`, un brouillon non publié sans décision de l'éditeur. Si l'obligation est confirmée : modèle `templates/accessibility-statement-fr.md` du skill, statut « non conforme » tant qu'aucun audit humain n'a été réalisé, jamais de taux inventé |
| Informations d'accessibilité EAA | NA | aucun service de commerce électronique au sens de l'EAA | À reconsidérer si une vente, un don en ligne ou un compte apparaît |

## 5. Sécurité (en-têtes, `vercel.json`)

| Point | Statut | Preuve | Correction |
|---|---|---|---|
| CSP stricte, sans inline `[ANSSI WEB]` `[OWASP A02]` | C | `vercel.json` ; aucune balise script/style en ligne | **Appliquée** : `object-src 'none'` ajouté ; `data:` retiré de `img-src` (inutilisé dans le site) |
| `X-Frame-Options: DENY` (en plus de `frame-ancestors 'none'`) | NC majeur → corrigé | absent | **Appliquée** |
| `Cross-Origin-Opener-Policy: same-origin` | NC majeur → corrigé | absent | **Appliquée** |
| `Cross-Origin-Resource-Policy: same-origin` | NT mineur → corrigé | absent | **Appliquée** |
| HSTS, nosniff, Referrer-Policy, Permissions-Policy | C (déclaré) | `vercel.json` ; HSTS effectif seulement en HTTPS | — |
| Revérification après correction | 0 NC, 0 point à revoir | `check-security.mjs` sur l'émulation locale | — |
| **Réécritures `/telechargements` et `/updates` vers `http://telechargements.kayzen-lyon.com`** | NC majeur | `vercel.json` `rewrites` | **À faire** : le trajet Vercel → IONOS des installeurs et des mises à jour n'est pas chiffré (risque de substitution d'un binaire). Activer un certificat TLS sur ce sous-domaine IONOS puis passer en `https://`. Non modifié ici : sans certificat vérifié, le changement casserait les téléchargements. Publier aussi les empreintes SHA-256 des installeurs |
| TLS (versions, suites) | NT | géré par Vercel | Tester avec un outil TLS externe |
| `X-Robots-Tag: noindex, nofollow` sur tout le site | Info | `vercel.json` | Pas un point de conformité ; contradictoire avec `<meta name="robots" content="index,follow">` des pages légales : décision SEO de l'éditeur |

## 6. Sobriété

| Point | Statut | Preuve |
|---|---|---|
| Site statique, aucun framework ni script tiers, 1 script local (`config.js`, ~1 Ko) | C `[best practice]` | `public/` |
| Images WebP dimensionnées, `loading="lazy"` hors héros, polices woff2 locales préchargées | C `[best practice]` | `index.html` |
| Cache des `assets/` 7 jours | C `[best practice]` | `vercel.json` |

## 7. Droits du consommateur

Non applicable en l'état (aucune vente, aucun paiement) : bouton de commande, rétractation, prix, médiateur, CGV `NA`. La FAQ et les CGU rappellent l'usage licite et le refus des DRM : cohérent avec la règle 2 du projet. Les CGU (`cgu.html`) restent un modèle à faire valider.

## 8. Ce qui reste à faire par une personne

1. **Éditeur** : compléter les placeholders visibles — téléphones des hébergeurs, immatriculation, durée de conservation des journaux, base légale des journaux, mécanisme de transfert hors UE ; confirmer la base légale et la durée de 3 ans pour les e-mails ; confirmer le public (mineurs ou non) et le chiffre d'affaires (lignes `to-confirm`).
2. **Technique** : TLS sur `telechargements.kayzen-lyon.com` puis réécritures en `https://` ; URL réelles dans les liens `data-link`.
3. **Accessibilité** : tests manuels clavier, lecteur d'écran, zoom 200 %, reflow 320 px.
4. **Juriste** : validation des trois pages légales (toujours marquées « MODÈLE À FAIRE VALIDER ») et de la qualification « pas de commerce électronique au sens de l'EAA ».
5. **Veille** : les faits du skill datent du 2026-11-14 ; relancer `python scripts/validate.py --strict` du skill avant toute mise en production tardive.

## 9. Fichiers modifiés par cette passe

- `apps/site/vercel.json` : en-têtes X-Frame-Options, COOP, CORP ; CSP `object-src 'none'`, sans `data:`.
- `apps/site/public/assets/style.css` : `scroll-padding-top` (seule règle ajoutée, aucun changement visuel).
- `apps/site/public/mentions-legales.html` : immatriculation, téléphones des hébergeurs (placeholders), lien `tel:`, section « Données personnelles ».
- `apps/site/public/confidentialite.html` : placeholders RGPD (base légale et durée des journaux, garantie de transfert).
- `apps/site/public/index.html` : ligne vide résiduelle retirée du pied de page.
- `apps/site/test/compliance.test.js` : 18 tests de non-régression (en-têtes, CSP, langue, lien d'évitement, absence de traceurs, alt, mentions légales, placeholders RGPD).
- `apps/site/compliance/` : profil, matrice d'applicabilité et rapport du skill.

*Résultat produit avec l'aide d'une IA ; ce n'est ni un audit ni un avis juridique.*
