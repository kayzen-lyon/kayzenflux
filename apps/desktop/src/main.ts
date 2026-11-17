import { app, BrowserWindow, Menu, dialog, shell, type MenuItemConstructorOptions } from 'electron';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { loadConfig } from '../../daemon/src/config.js';
import { startDaemon, type DaemonHandle } from '../../daemon/src/server.js';
import { parseDeepLink } from './deeplink.js';
import { createUpdater } from './updater.js';
import type { UpdateBridge } from '../../daemon/src/updates.js';

const PROTOCOL = 'kayzenflux';
const isWin = process.platform === 'win32';
const exe = isWin ? '.exe' : '';

let win: BrowserWindow | null = null;
let daemon: DaemonHandle | null = null;
let pendingLinks: string[] = [];
let updater: UpdateBridge | null = null;

// Une seule instance : un lien profond reçu par une 2e instance est transmis à la première.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const link = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    if (link) handleLink(link);
    focus();
  });
}

if (process.defaultApp && process.argv[1]) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// macOS : lien ouvert pendant que l'application tourne (ou la lance).
app.on('open-url', (e, url) => {
  e.preventDefault();
  handleLink(url);
});

function focus() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function handleLink(raw: string) {
  const url = parseDeepLink(raw);
  if (!url) return;
  if (daemon && win && !win.webContents.isLoading()) {
    daemon.notify('deeplink', { url });
    focus();
  } else {
    pendingLinks.push(url);
  }
}

/**
 * Les binaires livrés avec l'application sont copiés dans le dossier utilisateur au premier
 * lancement : yt-dlp peut ainsi se mettre à jour lui-même (« -U ») sans droits administrateur.
 */
function prepareBinaries(): { ytdlp?: string; ffmpeg?: string; binDir?: string; integrity: 'ok' | 'absent' | 'modifié' } {
  const shipped = join(process.resourcesPath, 'bin');
  const manifestPath = join(shipped, 'manifest.json');
  if (!existsSync(manifestPath)) return { integrity: 'absent' };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: Record<string, string> };
  // Vérifie l'intégrité des binaires livrés.
  for (const [name, hash] of Object.entries(manifest.files)) {
    const p = join(shipped, name);
    if (!existsSync(p) || createHash('sha256').update(readFileSync(p)).digest('hex') !== hash) {
      return { integrity: 'modifié' };
    }
  }
  const userBin = join(app.getPath('userData'), 'bin');
  mkdirSync(userBin, { recursive: true });
  for (const name of Object.keys(manifest.files)) {
    const src = join(shipped, name);
    const dst = join(userBin, name);
    // yt-dlp : on garde la copie utilisateur si elle est plus récente (mise à jour faite par -U).
    if (!existsSync(dst) || (!name.startsWith('yt-dlp') && statSync(dst).size !== statSync(src).size)) {
      copyFileSync(src, dst);
    }
  }
  return { ytdlp: join(userBin, `yt-dlp${exe}`), ffmpeg: join(userBin, `ffmpeg${exe}`), binDir: userBin, integrity: 'ok' };
}

async function boot() {
  const bins = prepareBinaries();
  if (bins.integrity === 'modifié') {
    dialog.showErrorBox('KAYZEN Flux', 'Les composants intégrés ont été modifiés. Réinstallez l’application depuis le site officiel.');
    app.quit();
    return;
  }
  if (bins.binDir) process.env.PATH = `${bins.binDir}${delimiter}${process.env.PATH ?? ''}`;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KAYZEN_DATA_DIR: process.env.KAYZEN_DATA_DIR ?? app.getPath('userData'),
    KAYZEN_DOWNLOAD_DIR: process.env.KAYZEN_DOWNLOAD_DIR ?? join(app.getPath('downloads'), 'KAYZEN Flux'),
    ...(bins.ytdlp ? { KAYZEN_YTDLP: bins.ytdlp } : {}),
    ...(bins.ffmpeg ? { KAYZEN_FFMPEG: bins.ffmpeg } : {}),
  };
  const uiDir = app.isPackaged ? join(process.resourcesPath, 'ui') : join(__dirname, '../../ui/dist');
  const config = loadConfig(env, uiDir);
  config.appVersion = app.getVersion();
  // Mise à jour automatique : l'état est transmis à l'interface par le flux d'événements du démon.
  updater ??= createUpdater((state) => daemon?.notify('update', state));
  try {
    daemon = await startDaemon(config, { updater });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
    daemon = await startDaemon({ ...config, port: 0 }, { updater }); // port occupé : le système en choisit un autre
  }

  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    title: 'KAYZEN Flux',
    backgroundColor: '#F7FAFC',
    icon: join(__dirname, '../build/icon.png'),
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });

  const origin = new URL(daemon.url).origin;
  // Toute navigation hors de l'interface locale s'ouvre dans le navigateur (https uniquement).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (new URL(url).origin !== origin) {
      e.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    }
  });
  // Aucun appel réseau implicite (dictionnaires orthographiques téléchargés chez Google par défaut).
  win.webContents.session.setSpellCheckerEnabled(false);
  win.webContents.session.setSpellCheckerDictionaryDownloadURL('http://127.0.0.1:9/');
  win.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'clipboard-sanitized-write'));
  win.once('ready-to-show', () => win?.show());
  win.webContents.on('did-finish-load', () => {
    // Laisse le temps au flux d'événements de se connecter avant de transmettre les liens en attente.
    setTimeout(() => {
      for (const url of pendingLinks) daemon?.notify('deeplink', { url });
      pendingLinks = [];
    }, 800);
  });
  win.on('closed', () => (win = null));
  await win.loadURL(daemon.url);

  const initial = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (initial) handleLink(initial);
}

function buildMenu() {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir le dossier des téléchargements', click: () => void shell.openPath(join(app.getPath('downloads'), 'KAYZEN Flux')) },
        { type: 'separator' },
        isWin ? { role: 'quit', label: 'Quitter' } : { role: 'close', label: 'Fermer la fenêtre' },
      ],
    },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Affichage', submenu: [{ role: 'reload', label: 'Recharger' }, { role: 'togglefullscreen', label: 'Plein écran' }, { role: 'zoomIn', label: 'Zoom avant' }, { role: 'zoomOut', label: 'Zoom arrière' }, { role: 'resetZoom', label: 'Taille réelle' }] },
    {
      label: 'Aide',
      submenu: [
        { label: 'Site de KAYZEN Flux', click: () => void shell.openExternal('https://flux.kayzen-lyon.com') },
        { label: 'Signaler un problème', click: () => void shell.openExternal('mailto:contact@kayzen-lyon.fr?subject=KAYZEN%20Flux') },
        { label: 'Licences des composants', click: () => void shell.openPath(join(process.resourcesPath, 'THIRD_PARTY_LICENSES.md')) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildMenu();
  try {
    await boot();
  } catch (err) {
    dialog.showErrorBox('KAYZEN Flux', `Démarrage impossible : ${(err as Error).message}`);
    app.quit();
  }
});

app.on('activate', () => {
  if (!win && daemon) void boot();
});

app.on('window-all-closed', () => {
  // Les abonnements tournent tant que l'application est ouverte ; on quitte proprement.
  void daemon?.close().finally(() => app.quit());
});
