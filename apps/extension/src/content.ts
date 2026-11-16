/**
 * Script de contenu (monde isolé) sur les pages vidéo :
 * masque les emplacements publicitaires, passe les publicités qui passeraient
 * malgré tout, saute les segments sponsorisés et ajoute le bouton
 * « Envoyer vers KAYZEN Flux ». Aucun téléchargement n'est fait ici.
 */
import { cleanVideoUrl, DEFAULT_SETTINGS, segmentAt, videoIdFromUrl, type Segment, type Settings } from './shared.js';

let settings: Settings = DEFAULT_SETTINGS;
let segments: Segment[] = [];
let currentVideo: string | null = null;
let wasMutedByUs = false;

const root = document.documentElement;
const stat = (key: 'ads' | 'segments', count = 1) => {
  try {
    void chrome.runtime.sendMessage({ type: 'stat', key, count });
  } catch {
    /* extension rechargée */
  }
};

function applyClasses() {
  root.classList.toggle('kzf-ads', settings.blockAds);
  root.classList.toggle('kzf-no-shorts', settings.hideShorts);
}

async function loadSettings() {
  const saved = (await chrome.storage.sync.get('settings')).settings as Partial<Settings> | undefined;
  settings = { ...DEFAULT_SETTINGS, ...saved };
  applyClasses();
  void refreshVideo(true);
  syncButton();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.settings) void loadSettings();
});

// Comptage des publicités retirées par le script de page.
window.addEventListener('message', (e) => {
  if (e.source === window && e.data?.source === 'kayzen-flux' && e.data.type === 'ads-pruned') stat('ads', e.data.count);
});

function toast(text: string) {
  const el = document.createElement('div');
  el.className = 'kzf-toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/** Filet de sécurité : si une publicité vidéo passe malgré tout, on la saute. */
function skipVisibleAd() {
  if (!settings.blockAds) return;
  const player = document.querySelector('#movie_player, .html5-video-player');
  const video = player?.querySelector('video');
  if (!player || !video) return;
  if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
    if (!video.muted) {
      video.muted = true;
      wasMutedByUs = true;
    }
    if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.2) {
      video.currentTime = video.duration - 0.1;
      stat('ads');
    }
    document.querySelectorAll<HTMLElement>('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button[id^="skip-button"]').forEach((b) => b.click());
  } else if (wasMutedByUs) {
    video.muted = false;
    wasMutedByUs = false;
  }
}

async function refreshVideo(force = false) {
  const id = videoIdFromUrl(location.href);
  if (!force && id === currentVideo) return;
  currentVideo = id;
  segments = [];
  syncButton();
  if (!id || !settings.sponsorBlock) return;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'segments', videoId: id })) as Segment[];
    if (currentVideo === id) segments = Array.isArray(res) ? res.filter((s) => settings.categories.includes(s.category)) : [];
  } catch {
    segments = [];
  }
}

function onTimeUpdate(e: Event) {
  const video = e.target as HTMLVideoElement;
  if (!settings.sponsorBlock || !segments.length) return;
  const player = video.closest('#movie_player, .html5-video-player');
  if (player?.classList.contains('ad-showing')) return;
  const seg = segmentAt(segments, video.currentTime);
  if (seg) {
    video.currentTime = seg.end;
    stat('segments');
    toast(seg.category === 'sponsor' ? 'Segment sponsorisé passé' : 'Segment passé');
  }
}

// Le lecteur remplace parfois l'élément <video> : écoute par délégation.
document.addEventListener('timeupdate', onTimeUpdate, true);

function syncButton() {
  const existing = document.getElementById('kzf-send');
  const url = cleanVideoUrl(location.href);
  if (!settings.sendButton || !url) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.dataset.url = url;
    return;
  }
  const btn = document.createElement('button');
  btn.id = 'kzf-send';
  btn.type = 'button';
  btn.dataset.url = url;
  btn.title = 'Ouvrir cette vidéo dans KAYZEN Flux (application de bureau)';
  btn.setAttribute('aria-label', 'Envoyer vers KAYZEN Flux');
  const icon = document.createElement('span');
  icon.className = 'kzf-send-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = 'Envoyer vers KAYZEN Flux';
  btn.append(icon, label);
  btn.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'send', url: btn.dataset.url });
    toast('Ouverture de KAYZEN Flux…');
  });
  document.body.appendChild(btn);
}

// Navigation interne de la page (application monopage) : on surveille l'adresse.
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    void refreshVideo();
  }
  skipVisibleAd();
  if (document.body && !document.getElementById('kzf-send')) syncButton();
}, 300);
document.addEventListener('yt-navigate-finish', () => void refreshVideo());

void loadSettings();
