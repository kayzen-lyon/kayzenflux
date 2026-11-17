# Ce que KAYZEN Flux peut reprendre de SmartTube et de NewPipe

> Analyse en lecture seule du 17/11/2026. Sources : `/home/claude/ref/SmartTube` (MIT, © 2020-present yuliskov) et
> `/home/claude/ref/NewPipe` (GPL-3.0, dépend de NewPipeExtractor v0.27.1, GPL-3.0, qui n'est pas cloné ici).
> Comparé à : `packages/core/src`, `apps/daemon/src`, `apps/extension/src`, `apps/ui/src` et
> `/home/claude/wt-android/apps/android`.
>
> Légende des avis : **[vérifié]** = constaté dans le code ; **[supposé]** = déduit, à confirmer.
> Effort : **XS** < 1 h · **S** ½ journée · **M** 1 à 2 jours · **L** 3 à 5 jours · **XL** plus d'une semaine.

---

## 0. Licences : ce qu'on a le droit de faire

| Source | Licence | Dans les parties MIT (core, démon, UI, bureau, extension, site) | Dans l'app Android (GPL-3.0) |
| --- | --- | --- | --- |
| SmartTube (`smarttubetv/`, `common/`) | MIT | Copie autorisée, **à condition de garder le copyright et le texte de la licence MIT** (en tête du fichier + `THIRD_PARTY_LICENSES.md`) | Copie autorisée (MIT est compatible avec la GPL), même condition |
| Sous-modules de SmartTube `MediaServiceCore`, `SharedModules` | **Inconnue** (dossiers vides dans le clone) [vérifié] | Ne rien reprendre sans avoir lu leur licence | Idem |
| Dépendances de SmartTube (`exoplayer-amzn-2.10.6`, `leanback-1.0.0`, `fragment-1.1.0`) | Apache-2.0 (projets AOSP / ExoPlayer) [supposé] | Copie possible avec fichier NOTICE | Possible |
| NewPipe (`app/`, `shared/`, `desktopApp/`) | GPL-3.0-or-later | **Aucune copie.** On ne reprend que des idées, réécrites de zéro sans copier la structure ligne à ligne | Copie autorisée (l'app est GPL-3.0) ; garder les en-têtes SPDX et le copyright |
| `us/shandian/giga/**` (gestionnaire de téléchargements de NewPipe) | GPL-3.0 (reprise de GigaGet) [supposé] | Aucune copie | Copie autorisée |
| NewPipeExtractor | GPL-3.0 | Aucune utilisation | Utilisation possible comme bibliothèque |
| Données SponsorBlock / DeArrow (API `sponsor.ajay.app`) | CC BY-NC-SA 4.0 pour la base [supposé, à confirmer sur sponsor.ajay.app] | Usage par API possible ; **mention d'attribution** dans « À propos » ; usage non commercial, compatible avec la gratuité | Idem |

Règle pratique : tout code venu de NewPipe va **uniquement** dans `apps/android` et dans un dossier ou un paquet
clairement GPL, jamais dans `packages/core` (MIT), même si l'app Android réutilise ce paquet.

---

## 1. Lecture, téléchargements, robustesse

### 1.1 Messages d'erreur et nouvelles tentatives (SmartTube `ErrorFixerController`)
- **Ce que fait SmartTube** : `common/src/main/java/com/liskovsoft/smartyoutubetv2/common/app/models/playback/controllers/ErrorFixerController.java`
  classe chaque erreur (réseau, mémoire, sous-titres en 429/500, 403), puis applique la bonne parade : changer de
  client, baisser la qualité, couper les sous-titres. Il **respecte le délai d'attente demandé par le serveur**
  (`applySabrBackoffAction`, l. 175 et suivantes) au lieu de relancer aussitôt, et limite le nombre de tentatives
  par vidéo (`MAX_SABR_ERROR_FIX_ATTEMPTS`).
- **Constat chez KAYZEN Flux [vérifié]** : `packages/core/src/errors.ts` applique la règle `/sign in/` au cas
  `login`. Le message de YouTube « Sign in to confirm you're not a bot » est donc affiché comme « Ce contenu
  nécessite un compte ou un abonnement », ce qui est **faux** et pousse l'utilisateur vers une impasse. Par
  ailleurs, `buildDownloadArgs` (`packages/core/src/args.ts`) ne fixe ni `--retries`, ni `--fragment-retries`, ni
  `--retry-sleep`, et aucune tâche en erreur ne peut être relancée d'un clic (pas de `retry` dans
  `apps/daemon/src/jobs.ts`).
- **À faire** : (a) ajouter un code `bot_check` placé avant `login`, avec un message honnête (« Le site demande une
  vérification anti-robot ; réessayez plus tard ou mettez le moteur à jour »), plus son test ; (b) ajouter
  `--retries 5 --fragment-retries 10 --retry-sleep http:exp=1:30` ; (c) ajouter une route `POST /api/jobs/:id/retry`
  et un bouton « Réessayer » ; sur un code `rate_limited`, proposer la relance après un délai croissant.
- **Intérêt** : bureau ★★★, Android ★★★ (même moteur), extension —.
- **Effort** : (a) + (b) **XS** ; (c) **S**.
- **Licence** : idée seulement (le code SmartTube porte sur ExoPlayer et ne s'applique pas à yt-dlp).
- **Risque** : ne **jamais** contourner la vérification anti-robot (pas de génération de jeton, voir § 4.2).

### 1.2 File persistante, reprise après redémarrage, réseau mesuré (NewPipe `us.shandian.giga`)
- **Ce que fait NewPipe** : `app/src/main/java/us/shandian/giga/service/DownloadManager.java` conserve les tâches
  sur disque (`get/sqlite`), les **récupère** au démarrage (`tryRecover`, `canRecoverMission`,
  `get/DownloadMissionRecover.java`), gère un nombre maximal de tentatives (`mPrefMaxRetry`) et **met en pause
  les téléchargements sur un réseau mesuré** (`enum NetworkState {Unavailable, Operating, MeteredOperating}`,
  l. 33 ; `mPrefMeteredDownloads`, l. 499-520), puis les relance une fois revenu sur un réseau non mesuré. Le
  téléchargement tourne dans un service de premier plan (`DownloadManagerService.java`).
- **Constat [vérifié]** : la file du démon est en mémoire (`private jobs = new Map<string, Job>()`,
  `apps/daemon/src/jobs.ts` l. 94). Un redémarrage de l'application perd les tâches en attente. yt-dlp sait déjà
  reprendre un fichier `.part` : il suffit de relancer la même commande.
- **À faire** : enregistrer la file (`jobs.json`, écriture atomique) ; au démarrage, remettre en « En attente » les
  tâches non terminées ; sur Android, ajouter un réglage « Télécharger uniquement en Wi-Fi » (via
  `ConnectivityManager.isActiveNetworkMetered()`, comme `ListHelper.isMeteredNetwork`,
  `app/src/main/java/org/schabi/newpipe/util/ListHelper.java` l. 727) et ne pas lancer les vérifications
  d'abonnements sur un réseau mesuré.
- **Intérêt** : bureau ★★★, Android ★★★.
- **Effort** : bureau **S** ; Android **M** (service de premier plan + WorkManager).
- **Licence** : bureau = réécriture (idée) ; Android = on peut reprendre des morceaux de `us/shandian/giga`, mais ce
  code est lourd et lié à son propre moteur HTTP ; réécrire autour de yt-dlp est plus simple.

### 1.3 Reprise de lecture et historique local (NewPipe `StreamStateEntity`, SmartTube `VideoStateService`)
- **Ce que font-ils** : NewPipe enregistre la position de lecture
  (`app/src/main/java/org/schabi/newpipe/database/stream/model/StreamStateEntity.kt`) avec deux seuils simples :
  on ne sauvegarde qu'après 5 s (`PLAYBACK_SAVE_THRESHOLD_START_MILLISECONDS = 5000L`) et on considère la vidéo
  « vue » près de la fin et au-delà des 3/4 (`isFinished`). `local/history/HistoryRecordManager.kt` gère
  l'historique de lecture et de recherche, avec suppression totale ou ligne par ligne. SmartTube garde un état
  par vidéo dans une liste LRU bornée (50 ou 300 selon la RAM) et écrit sur disque toutes les 10 s
  (`.../common/app/models/playback/service/VideoStateService.java` l. 19-21).
- **Constat [vérifié]** : le lecteur hors connexion (`apps/ui/src/components/PlayerBar.tsx`) n'enregistre pas la
  position.
- **À faire** : stocker `{libraryId → positionMs, updatedAt}` (borné à 500 entrées), reprendre au même endroit,
  pastille « Vu / En cours » dans la bibliothèque, bouton « Effacer l'historique ». Tout reste local.
- **Intérêt** : bureau ★★★ (podcasts, cours, longues vidéos), Android ★★★.
- **Effort** : **S**.
- **Licence** : idée (les seuils sont des faits, pas du code protégé).

### 1.4 Lecture en arrière-plan, audio seul, file de lecture, PiP (NewPipe `player/`, SmartTube `BackgroundPlaybackService`)
- **Ce que font-ils** : NewPipe a trois interfaces pour un même lecteur (`player/ui/MainPlayerUi.java`,
  `PopupPlayerUi.java`, `BackgroundPlayerUi.java`), une file de lecture déplaçable
  (`player/playqueue/PlayQueue.java`, `PlayQueueItemTouchCallback.java`), une MediaSession pour les écouteurs,
  l'écran verrouillé et Android Auto (`player/mediasession/`, `player/mediabrowser/`) et une notification avec
  actions configurables (`player/notification/`). SmartTube a `common/.../misc/BackgroundPlaybackService.java` et
  un réglage d'activation du PiP (`prefs/PlayerData.java`, `setBackgroundMode`, l. 246).
- **Pour KAYZEN Flux** : uniquement pour les **fichiers déjà téléchargés** (la règle « local-first » ne s'applique
  pas à de la lecture en ligne, et la lecture en ligne en arrière-plan de YouTube est un point sensible, voir § 5).
  Bureau : file de lecture dans la bibliothèque, `navigator.mediaSession` (touches multimédia, contrôles du
  système), PiP vidéo par `requestPictureInPicture()` dans Electron. Android : `MediaSessionService` de Media3.
- **Intérêt** : Android ★★★, bureau ★★.
- **Effort** : bureau **S** (MediaSession + file) ; Android **L**.
- **Licence** : Android peut reprendre `player/playqueue` et `player/mediasession` de NewPipe (GPL) ; le bureau
  réécrit.

### 1.5 Choix de qualité, de codec et de piste audio par défaut (NewPipe `ListHelper`, SmartTube `PlayerData`)
- **Ce que font-ils** : `util/ListHelper.java` (NewPipe) choisit une résolution par défaut, une résolution plus
  basse sur réseau mesuré, un format audio préféré et une **piste audio par langue** (`getDefaultAudioTrackGroup`,
  `getGroupedAudioStreams`, l. 133-336). SmartTube mémorise le dernier format choisi et la langue audio
  (`prefs/PlayerData.java`, `getFormat`, `setAudioLanguage`, l. 358-644).
- **Pour KAYZEN Flux** : réglages « Codec préféré (H.264 compatible partout / AV1 / VP9) », « Langue audio
  préférée » (vidéos doublées) et « Qualité max sur réseau mesuré » ; tout se traduit par un `-S` (tri des
  formats) de yt-dlp construit dans `buildDownloadArgs`, avec tests.
- **Intérêt** : bureau ★★, Android ★★★.
- **Effort** : **S**.
- **Licence** : idée.

### 1.6 Sous-titres et chapitres
- **NewPipe** convertit le TTML en SRT (`us/shandian/giga/postprocessing/TtmlConverter.java`) et propose plusieurs
  langues. KAYZEN Flux fige les langues `fr.*,en.*` (`args.ts` l. 91) [vérifié].
- **À faire** : liste de langues de sous-titres configurable ; choix « intégrés au fichier » ou « fichier .srt à
  côté ». Les chapitres sont déjà gérés (`--split-chapters`).
- **Effort** : **XS** à **S**. **Licence** : idée.

---

## 2. SponsorBlock, DeArrow, extension

### 2.1 SponsorBlock complet (SmartTube `SponsorBlockData` / `SponsorBlockController`)
- **Ce que fait SmartTube** : `common/.../prefs/SponsorBlockData.java` gère **9 catégories** (sponsor, intro,
  outro, self_promo, interaction, music_offtopic, preview, poi_highlight, filler), une **action par catégorie**
  (`ACTION_SKIP_ONLY`, `ACTION_SKIP_WITH_TOAST`, `ACTION_SHOW_DIALOG`, `ACTION_DO_NOTHING`, l. 21-25), une
  **couleur par catégorie** sur la barre de lecture (`initColorMapping`, l. 70-80) et une **liste de chaînes
  exclues** (`mExcludedChannels`, l. 33). `SponsorBlockController.java` (l. 359-406) saute sans message en PiP ou
  écran éteint.
- **Constat [vérifié]** :
  - extension : 5 catégories seulement (`apps/extension/src/shared.ts`, `SPONSOR_CATEGORIES`) ; pas de
    `music_offtopic`, `preview`, `filler`, `poi_highlight` ; action unique « sauter » ; pas d'exclusion de chaîne ;
  - démon : catégories **codées en dur** `sponsor,selfpromo,interaction` (`packages/core/src/args.ts` l. 86) et
    seule action « couper » (`--sponsorblock-remove`), qui **modifie définitivement le fichier**.
- **À faire** : (a) ajouter les 4 catégories manquantes dans l'extension (**XS**) ; (b) rendre les catégories
  configurables dans le démon et ajouter le mode « marquer comme chapitres » (`--sponsorblock-mark`), non
  destructif, en plus de « couper » (**XS** à **S**) ; (c) action par catégorie (sauter / sauter avec message /
  demander / rien), segments colorés sur la barre de progression, chaînes exclues (**S** à **M**) ; (d) catégorie
  `poi_highlight` : bouton « Aller au moment fort ».
- **Licence** : idée ou copie (MIT) ; la logique tient en quelques lignes, réécrire en TypeScript est plus simple.
- **Risque** : attribution SponsorBlock à afficher ; la requête par préfixe de hachage (déjà en place) doit rester.

### 2.2 DeArrow (titres et miniatures moins racoleurs) (SmartTube `DeArrowProcessor`, `ClickbaitRemover`)
- **Ce que fait SmartTube** : `common/.../misc/DeArrowProcessor.java` remplace titres et miniatures par ceux de la
  communauté DeArrow, par lots de vidéos, avec deux interrupteurs (`prefs/DeArrowData.java`).
  `common/.../utils/ClickbaitRemover.java` propose, sans réseau, une **miniature prise au début, au milieu ou à la
  fin** de la vidéo (images `hq1/hq2/hq3` à la place de `hqdefault`).
- **Pour KAYZEN Flux** : extension (option désactivée par défaut) ; le mode « miniature neutre » sans réseau est
  le plus simple et le plus respectueux de la vie privée.
- **Intérêt** : extension ★★.
- **Effort** : miniature neutre **XS-S** ; DeArrow complet **M** (observateur DOM sur les grilles de vignettes).
- **Licence** : `ClickbaitRemover` (MIT) peut être porté avec mention ; données DeArrow sous la même licence que
  SponsorBlock [supposé].
- **Risque** : ne pas envoyer d'ID de vidéo en clair (utiliser l'API par préfixe de hachage si elle existe pour
  DeArrow, à vérifier) ; bien indiquer que les titres viennent de la communauté.

### 2.3 Vitesse par défaut, par chaîne (SmartTube `PlayerData`)
- **Ce que fait SmartTube** : `prefs/PlayerData.java` gère une vitesse globale, une vitesse **par chaîne**
  (`getSpeed(String channelId)`, `setSpeed(channelId, speed)`, l. 558-606), une vitesse par vidéo et un réglage
  « toutes les vitesses » (pas de 0,05).
- **Constat [vérifié]** : aucune gestion de vitesse dans `apps/extension/src`.
- **À faire** : réglage « Vitesse par défaut » dans la fenêtre de l'extension, appliqué à `video.playbackRate` à
  chaque nouvelle vidéo (**XS**) ; mémorisation par chaîne ensuite (**S**). Même chose dans le lecteur hors
  connexion du bureau.
- **Licence** : idée.

### 2.4 Masquer des chaînes (SmartTube `BlockedChannelData`)
- `common/.../prefs/BlockedChannelData.java` + `app/presenters/BrowsePresenter.java` : masquer les vidéos de chaînes
  choisies dans toutes les listes. Pour l'extension : menu contextuel « Masquer cette chaîne ». **S**. Idée.

### 2.5 Return YouTube Dislike
- Ni SmartTube ni NewPipe ne l'intègrent dans ce clone [vérifié par recherche]. Les chiffres de l'API RYD sont des
  **estimations** ; la règle d'honnêteté impose de l'écrire (« estimation »), et la requête envoie l'ID de vidéo en
  clair à un tiers. **Priorité basse**, option désactivée par défaut si elle est faite.

---

## 3. Abonnements sans compte, import/export, sauvegarde

### 3.1 Abonnements sans compte, flux rapide, groupes (NewPipe `local/feed`, `local/subscription`)
- **Ce que fait NewPipe** : abonnements stockés localement ; `local/feed/service/FeedLoadManager.kt` ne recharge
  que les chaînes « périmées » selon un **seuil réglable** (`feed_update_threshold`, l. 60-96) et peut utiliser une
  **méthode de flux dédiée, beaucoup plus rapide** (le flux RSS de la chaîne) au lieu de charger toute la page
  (`feed_use_dedicated_fetch_method`, l. 69 et 172-191 ; la chaîne d'aide `res/values/strings.xml` l. 738 prévient
  que ce flux est incomplet : pas de durée ni de statut direct). Les vieux éléments sont purgés
  (`postProcessFeed`, l. 261-269). Groupes de chaînes (`FeedGroupEntity`, `FeedGroupIcon.kt`), notifications des
  nouveautés (`local/feed/notifications/NotificationWorker.kt`, `ScheduleOptions.kt`).
- **Constat [vérifié]** : `apps/daemon/src/subscriptions.ts` interroge chaque abonnement avec yt-dlp
  (`buildFeedArgs`, `--flat-playlist`) toutes les 1 à 24 h, sans groupes, sans fil d'actualité consultable, sans
  notification.
- **À faire** : (a) onglet « Nouveautés » (fil chronologique de toutes les chaînes suivies, bouton
  « Télécharger ») ; (b) lecture du flux RSS public de la chaîne quand il existe (une requête HTTP légère au lieu
  d'un appel yt-dlp ; ce n'est pas l'API YouTube Data), avec repli sur yt-dlp ; (c) groupes ; (d) notification
  système optionnelle.
- **Intérêt** : bureau ★★★, Android ★★★.
- **Effort** : (a) + (b) **M** ; (c) + (d) **M**.
- **Licence** : bureau = idée ; Android = copie possible.

### 3.2 Import d'abonnements (NewPipe `SubscriptionsImportExportHelper`)
- **Ce que fait NewPipe** : `local/subscription/workers/SubscriptionImportWorker.kt` importe depuis une URL de
  chaîne, un fichier (export Google Takeout, voir `strings.xml` l. 530 `import_youtube_instructions`) ou un export
  NewPipe précédent (`PreviousExportMode`) ; `ImportExportJsonHelper.kt` écrit/lit un JSON simple
  `{subscriptions:[{service_id,url,name}]}`.
- **À faire** : importer le **CSV Google Takeout** (`subscriptions.csv` : ID, URL, titre), le **JSON NewPipe** et
  l'**OPML** (podcasts, lecteurs RSS) ; exporter en JSON et OPML. Analyse stricte (zod) et dédoublonnage.
- **Intérêt** : très fort pour attirer les utilisateurs de NewPipe/FreeTube ; bureau ★★★, Android ★★★.
- **Effort** : **S**.
- **Licence** : les formats ne sont pas protégés ; réécrire l'analyseur.

### 3.3 Sauvegarde et restauration des réglages (NewPipe `ImportExportManager`, SmartTube `BackupAndRestoreManager`)
- **NewPipe** : `settings/export/ImportExportManager.kt` produit un ZIP (base + préférences JSON) ; à la lecture,
  `PreferencesObjectInputStream.kt` **refuse toute classe non listée** (protection contre l'injection lors de la
  désérialisation, avec références OWASP). **SmartTube** : `common/.../misc/BackupAndRestoreManager.java`, sauvegarde
  locale ou Google Drive (`GDriveBackupManager.java`) et restauration rapide (`QuickRestorePresenter.java`).
- **À faire** : « Exporter mes données » → ZIP contenant `settings.json`, `subscriptions.json`, historique,
  modèles de nom de fichier ; import avec **schéma zod strict** (jamais d'`eval`, pas de chemins absolus
  acceptés tels quels, pas de dossier de téléchargement hors du dossier utilisateur sans confirmation). Pas de
  sauvegarde cloud (règle de confidentialité ; l'utilisateur place le ZIP où il veut).
- **Intérêt** : bureau ★★, Android ★★ (changement de téléphone), transfert bureau ↔ Android ★★.
- **Effort** : **S**.
- **Licence** : idée.

### 3.4 Effacement d'urgence (NewPipe `PanicResponderActivity`)
- `app/src/main/java/org/schabi/newpipe/PanicResponderActivity.java` réagit à l'action
  `info.guardianproject.panic.action.TRIGGER` (applications « panic button ») en effaçant l'historique.
  Android uniquement, **XS-S**, copie GPL possible. Gain réel pour les publics exposés (journalistes, militants).

---

## 4. Architecture

### 4.1 Extracteur : rester sur yt-dlp
- NewPipe dépend de **NewPipeExtractor** (GPL-3.0, `gradle/libs.versions.toml` l. 78) ; SmartTube de
  **MediaServiceCore** (sous-module, licence non vérifiée). Les deux maintiennent leur propre extracteur YouTube,
  ce qui impose des correctifs très fréquents.
- **Recommandation** : garder yt-dlp (plus de 1 000 sites, mises à jour officielles, binaire non modifié) partout.
  Sur Android, NewPipeExtractor pourrait servir **uniquement** à un affichage rapide (recherche, fil) sans lancer
  CPython, mais cela double la maintenance et la surface juridique. **Pas avant la 1.x Android stable.**

### 4.2 Point de vigilance : jetons anti-robot (NewPipe `util/potoken/`)
- `app/src/main/java/org/schabi/newpipe/util/potoken/PoTokenGenerator.kt`, `PoTokenWebView.kt` exécutent le script
  d'attestation de YouTube dans une WebView pour obtenir un jeton. SmartTube réagit aux erreurs `PoTokenException`
  (`ErrorFixerController.java` l. 410).
- **Ne pas reprendre** : ce n'est pas un DRM au sens de la règle 2, mais c'est un contournement d'une mesure
  technique, juridiquement discuté (une décision allemande, LG Hambourg 2021, affaire Uberspace / youtube-dl, a
  qualifié une mesure de YouTube de mesure technique efficace ; **à faire confirmer par l'avocat**, voir
  `docs/DOSSIER-AVOCAT.md`). Si yt-dlp gère lui-même un mécanisme similaire, KAYZEN Flux l'utilise tel quel, sans
  ajouter de code propre.

### 4.3 Gestion des erreurs avec signalement volontaire (NewPipe `error/`)
- `error/ErrorUtil.kt` choisit le canal le moins intrusif (barre en bas avec bouton « Signaler », notification,
  écran complet) ; `ErrorActivity.kt` montre le rapport **avant** envoi et l'utilisateur choisit de l'envoyer.
- **Pour KAYZEN Flux** : bouton « Copier le rapport » (version, OS, version de yt-dlp, code d'erreur, **sans URL**,
  conforme à la règle 7) + lien vers le formulaire de signalement GitHub. Aucun envoi automatique. **S**. Idée.

### 4.4 Mises à jour de l'application vérifiées par signature (NewPipe `ReleaseVersionUtil`, SmartTube `AppUpdatePresenter`)
- NewPipe ne propose la mise à jour que si l'APK installé est signé par **son** certificat
  (`util/ReleaseVersionUtil.kt`, `RELEASE_CERT_PUBLIC_KEY_SHA256`, l. 15-26) : pas de fausse alerte pour les
  versions F-Droid ou compilées soi-même. Vérification espacée (`isLastUpdateCheckExpired`). SmartTube a un
  lanceur de mise à jour intégré avec journal des modifications (`app/presenters/dialogs/AppUpdatePresenter.java`).
- **Leçon de sécurité SmartTube** (`README.md` l. 4-20) : poste de développement infecté, clés publiques
  possiblement compromises, changement de clé imposé. Pour KAYZEN Flux : clé de signature hors du poste de
  développement (CI avec secret), sommes SHA-256 publiées, builds reproductibles si possible, procédure écrite
  de rotation de clé.
- **À faire (Android)** : même contrôle de certificat avant de proposer une mise à jour ; journal des
  modifications affiché. **S**.

### 4.5 Partage vers l'app et détection de lien (NewPipe `RouterActivity`, `UrlFinder`)
- `app/src/main/java/org/schabi/newpipe/RouterActivity.java` reçoit un lien partagé et propose « Lire / Audio
  seul / Ajouter à la file / Télécharger » ; `util/urlfinder/UrlFinder.kt` (`firstUrlFromInput`) extrait le premier
  lien d'un texte partagé (« Regarde ça : https://… »).
- **Pour KAYZEN Flux** : sur Android, feuille de partage → choix du préréglage (MP3, MP4 720p…) et lancement direct ;
  sur le bureau, même extraction du lien dans le champ de saisie et pour `kayzenflux://add?url=`. **XS-S**.

---

## 5. Mode TV, télécommande, cast

- **SmartTube** : interface Leanback (`leanback-1.0.0`, `smarttubetv/`), adaptation de la fréquence d'image de
  l'écran (`AutoFrameRateController.java`), serveur DIAL pour le « cast » (`common/.../misc/DialServer.java`,
  `RemoteController.java`), raccourcis télécommande (`GlobalKeyTranslator.java`, `PlayerKeyTranslator.java`),
  économiseur d'écran (`ScreensaverManager.java`).
- **Pour KAYZEN Flux** : un mode TV n'a d'intérêt que pour lire la bibliothèque **locale** (ou un dossier partagé)
  sur la télé. Le serveur DIAL de SmartTube se présente comme l'app YouTube : risque de marque (règle 4) et de
  conditions d'utilisation, **à ne pas reprendre**. Priorité basse, effort **XL**.

---

## 6. Risques à garder en tête

| Risque | Détail | Mesure |
| --- | --- | --- |
| Règles des stores | Ni SmartTube (`README.md` l. 65 : « not officially published on any app store ») ni NewPipe ne sont sur Google Play : le Play Store refuse les apps qui téléchargent depuis YouTube ou y lisent en arrière-plan contre ses conditions. Le Chrome Web Store refuse les extensions qui téléchargent depuis YouTube. | Android : F-Droid + APK signé sur le site ; extension : ne jamais télécharger (règle 3, déjà respectée) ; voir `docs/STORES.md`. |
| Marque | Les deux projets s'appuient sur la marque YouTube (noms de réglages, DIAL). | Aucune mention dans le nom, l'icône, les fiches ; parler de « sites vidéo ». |
| Contournement | Jetons anti-robot (§ 4.2), comptes Google (SmartTube `GoogleSignInPresenter.java`, `AccountsData.java`). | Ne pas reprendre ; aucun identifiant utilisateur (règle 2). |
| Licences | Copie accidentelle de code GPL dans `packages/core` (MIT), réutilisé par Android. | Revue de PR avec contrôle d'origine ; en-têtes SPDX ; `THIRD_PARTY_LICENSES.md`. |
| Données tierces | SponsorBlock/DeArrow sous licence CC BY-NC-SA [supposé] ; RYD = estimations. | Attribution, mention « estimation », options désactivables. |
| Confidentialité | Historique, abonnements, positions de lecture = données personnelles locales. | Stockage local seulement, bouton d'effacement, export chiffré facultatif, pas de synchronisation cloud. |
| Maintenance | Chaque intégration tierce (SponsorBlock, DeArrow, RSS) peut casser. | Tests sur réponses enregistrées, repli silencieux, interrupteur par fonction. |
| Chaîne d'approvisionnement | Incident SmartTube (poste compromis, clés à changer). | Signature en CI, sommes SHA-256, procédure de rotation. |
| Traces de l'ancienne offre payante | L'offre Premium a été retirée pendant l'analyse : `packages/core/src/presets.ts` l. 88 expose désormais `LIMITS` commun (5 000 éléments, 6 en parallèle) [vérifié]. | Vérifier que l'UI, le site et les docs ne mentionnent plus « Premium » (règle 8). |

---

## 7. Top 8 priorisé (gain pour l'utilisateur / effort)

| # | Amélioration | Cible | Effort | Inspiration | Licence |
| --- | --- | --- | --- | --- | --- |
| 1 | **Corriger le message « not a bot »** (aujourd'hui affiché comme « nécessite un compte ») + `--retries`/`--fragment-retries`/`--retry-sleep` + tests | bureau, Android | **XS (< 1 h)** | SmartTube `ErrorFixerController.java` | idée |
| 2 | **SponsorBlock : 4 catégories manquantes dans l'extension + catégories configurables et mode « marquer en chapitres » (non destructif) dans le démon** | extension, bureau | **XS (< 1 h)** pour l'extension, S pour le démon | SmartTube `SponsorBlockData.java` | idée ou MIT |
| 3 | **Vitesse de lecture par défaut** dans l'extension (puis par chaîne) | extension | **XS (< 1 h)** | SmartTube `PlayerData.java` | idée |
| 4 | **File persistante + reprise après redémarrage + bouton « Réessayer »** ; Wi-Fi seul sur Android | bureau, Android | S / M | NewPipe `DownloadManager.java` | idée (bureau), GPL (Android) |
| 5 | **Import d'abonnements** Takeout CSV / NewPipe JSON / OPML + export | bureau, Android | S | NewPipe `SubscriptionImportWorker.kt` | idée |
| 6 | **Reprise de lecture + historique local** dans le lecteur hors connexion | bureau, Android | S | NewPipe `StreamStateEntity.kt` | idée |
| 7 | **Fil « Nouveautés » des abonnements** via flux RSS rapide, groupes, notifications | bureau, Android | M | NewPipe `FeedLoadManager.kt` | idée (bureau), GPL (Android) |
| 8 | **Lecture en arrière-plan / audio seul / file de lecture / PiP pour les fichiers téléchargés** (MediaSession) | Android, bureau | L / S | NewPipe `player/`, SmartTube `BackgroundPlaybackService.java` | GPL (Android) |

Les trois réalisables en moins d'une heure chacun : **n° 1, n° 2 (partie extension) et n° 3**.
Ensuite, à faible coût : sauvegarde/restauration des réglages (§ 3.3, S) et détection du lien dans un texte
partagé (§ 4.5, XS-S).
