import { DEFAULT_SETTINGS, SPONSOR_CATEGORIES, type Settings } from './shared.js';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const TOGGLES = ['blockAds', 'sponsorBlock', 'hideShorts', 'sendButton'] as const;

async function main() {
  const saved = (await chrome.storage.sync.get('settings')).settings as Partial<Settings> | undefined;
  let settings: Settings = { ...DEFAULT_SETTINGS, ...saved };
  const save = () => chrome.storage.sync.set({ settings });

  if (new URLSearchParams(location.search).has('welcome')) $('welcome').hidden = false;

  for (const key of TOGGLES) {
    const input = $<HTMLInputElement>(key);
    input.checked = settings[key];
    input.addEventListener('change', () => {
      settings = { ...settings, [key]: input.checked };
      void save();
      $('cats').toggleAttribute('disabled', !settings.sponsorBlock);
    });
  }

  const cats = $('cats');
  cats.toggleAttribute('disabled', !settings.sponsorBlock);
  for (const cat of SPONSOR_CATEGORIES) {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = settings.categories.includes(cat.id);
    box.addEventListener('change', () => {
      settings = { ...settings, categories: box.checked ? [...new Set([...settings.categories, cat.id])] : settings.categories.filter((c) => c !== cat.id) };
      void save();
    });
    label.append(box, document.createTextNode(cat.label));
    cats.appendChild(label);
  }

  const { stats } = (await chrome.storage.local.get('stats')) as { stats?: { ads?: number; segments?: number } };
  $('statAds').textContent = String(stats?.ads ?? 0);
  $('statSeg').textContent = String(stats?.segments ?? 0);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const send = $<HTMLButtonElement>('send');
  const canSend = !!tab?.url && /^https?:\/\//.test(tab.url);
  send.disabled = !canSend;
  send.addEventListener('click', async () => {
    if (!tab?.url) return;
    send.textContent = 'Ouverture de KAYZEN Flux…';
    await chrome.runtime.sendMessage({ type: 'send', url: tab.url, tabId: tab.id });
    setTimeout(() => window.close(), 600);
  });
}

void main();
