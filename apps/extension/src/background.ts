import { DEFAULT_SETTINGS, deepLink, segmentsForVideo, sha256Hex, type Settings } from './shared.js';

const INJECT_ID = 'kzf-inject';
const VIDEO_MATCHES = ['https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://music.youtube.com/*'];

async function getSettings(): Promise<Settings> {
  const saved = (await chrome.storage.sync.get('settings')).settings as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...saved };
}

/** Le script de page (retrait des données publicitaires) n'est enregistré que si l'option est active. */
async function syncInjection(): Promise<void> {
  const { blockAds } = await getSettings();
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [INJECT_ID] }).catch(() => []);
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [INJECT_ID] });
  if (blockAds) {
    await chrome.scripting.registerContentScripts([
      { id: INJECT_ID, js: ['inject.js'], matches: VIDEO_MATCHES, runAt: 'document_start', world: 'MAIN', allFrames: false },
    ]);
  }
  // Règles réseau (blocage des requêtes publicitaires) alignées sur l'option.
  await chrome.declarativeNetRequest.updateEnabledRulesets(blockAds ? { enableRulesetIds: ['ads'] } : { disableRulesetIds: ['ads'] });
}

function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'kzf-send-link', title: 'Envoyer ce lien vers KAYZEN Flux', contexts: ['link'] });
    chrome.contextMenus.create({ id: 'kzf-send-page', title: 'Envoyer cette page vers KAYZEN Flux', contexts: ['page', 'video', 'audio'] });
  });
}

/** Ouvre le lien profond depuis l'onglet (ne quitte pas la page ; le système demande quelle application ouvrir). */
export async function sendToApp(tabId: number | undefined, url: string): Promise<void> {
  if (!/^https?:\/\//.test(url)) return;
  const link = deepLink(url);
  if (tabId !== undefined) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (href: string) => {
          const a = document.createElement('a');
          a.href = href;
          a.rel = 'noopener';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
        },
        args: [link],
      });
      return;
    } catch {
      /* page non scriptable (ex. page interne du navigateur) */
    }
  }
  await chrome.tabs.create({ url: link, active: false });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  setupMenus();
  await syncInjection();
  if (details.reason === 'install') await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?welcome=1') });
});
chrome.runtime.onStartup?.addListener(() => {
  setupMenus();
  void syncInjection();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.settings) void syncInjection();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.menuItemId === 'kzf-send-link' ? info.linkUrl : info.pageUrl;
  if (url) void sendToApp(tab?.id, url);
});

chrome.runtime.onMessage.addListener((msg: { type?: string; videoId?: string; url?: string; tabId?: number }, sender, reply) => {
  if (msg.type === 'segments' && typeof msg.videoId === 'string' && /^[\w-]{11}$/.test(msg.videoId)) {
    void (async () => {
      try {
        const { categories } = await getSettings();
        // Confidentialité : seul un préfixe de 4 caractères du hachage est envoyé à SponsorBlock.
        const prefix = (await sha256Hex(msg.videoId!)).slice(0, 4);
        const res = await fetch(`https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${encodeURIComponent(JSON.stringify(categories))}`);
        reply(res.ok ? segmentsForVideo(await res.json(), msg.videoId!) : []);
      } catch {
        reply([]);
      }
    })();
    return true;
  }
  if (msg.type === 'send' && typeof msg.url === 'string') {
    void sendToApp(msg.tabId ?? sender.tab?.id, msg.url).then(() => reply(true));
    return true;
  }
  if (msg.type === 'stat' && (msg as { key?: string }).key) {
    const key = (msg as unknown as { key: 'ads' | 'segments'; count?: number }).key;
    const count = Math.max(1, Math.min(Number((msg as unknown as { count?: number }).count) || 1, 50));
    void chrome.storage.local.get('stats').then(({ stats }) => {
      const s = { ads: 0, segments: 0, ...(stats as object) } as Record<string, number>;
      s[key] = (s[key] ?? 0) + count;
      return chrome.storage.local.set({ stats: s });
    });
  }
  return false;
});
