import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, eventsUrl } from './api';
import type { Job, LibraryItem, Page, Settings, Status } from './types';

interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  text: string;
}

interface AppState {
  page: Page;
  go: (p: Page) => void;
  status: Status | null;
  settings: Settings | null;
  setSettings: (s: Settings) => void;
  jobs: Job[];
  library: LibraryItem[];
  refreshLibrary: () => Promise<void>;
  connected: boolean;
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
  playing: LibraryItem | null;
  play: (item: LibraryItem | null) => void;
  dark: boolean;
  toggleDark: () => void;
  urlInputRef: React.MutableRefObject<HTMLInputElement | null>;
  refreshStatus: () => Promise<void>;
  pendingUrl: string | null;
  consumePendingUrl: () => string | null;
}

const Ctx = createContext<AppState | null>(null);

const PAGES: Page[] = ['home', 'downloads', 'library', 'subscriptions', 'settings', 'shortcuts'];
const readHash = (): Page => {
  const h = location.hash.replace('#/', '') as Page;
  return PAGES.includes(h) ? h : 'home';
};

function readDark(): boolean {
  try {
    const saved = localStorage.getItem('kzf-theme');
    if (saved) return saved === 'dark';
  } catch {
    /* stockage indisponible */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(readHash);
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [playing, setPlaying] = useState<LibraryItem | null>(null);
  const [dark, setDark] = useState(readDark);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);

  const go = useCallback((p: Page) => {
    location.hash = `#/${p}`;
  }, []);

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('kzf-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignoré */
    }
  }, [dark]);

  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary(await api.library());
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }, [toast]);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.status());
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    void refreshStatus();
    api.settings().then(setSettings).catch(() => undefined);
    void refreshLibrary();
  }, [refreshLibrary, refreshStatus]);

  // Flux temps réel (Server-Sent Events) depuis le démon local.
  useEffect(() => {
    const es = new EventSource(eventsUrl());
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener('snapshot', (e) => setJobs(JSON.parse((e as MessageEvent).data).jobs));
    es.addEventListener('job', (e) => {
      const job: Job = JSON.parse((e as MessageEvent).data);
      setJobs((list) => {
        const i = list.findIndex((j) => j.id === job.id);
        if (i === -1) return [job, ...list];
        const copy = list.slice();
        copy[i] = job;
        return copy;
      });
      if (job.phase === 'done') toast(`Terminé : ${job.title}`, 'success');
      if (job.phase === 'error' && job.error) toast(job.error, 'error');
    });
    es.addEventListener('removed', (e) => {
      const { id } = JSON.parse((e as MessageEvent).data);
      setJobs((list) => list.filter((j) => j.id !== id));
    });
    es.addEventListener('library', (e) => {
      const item: LibraryItem = JSON.parse((e as MessageEvent).data);
      setLibrary((list) => [item, ...list.filter((x) => x.id !== item.id && x.filePath !== item.filePath)]);
    });
    es.addEventListener('license', () => void refreshStatus());
    // Lien reçu depuis l'extension navigateur (via l'application de bureau).
    es.addEventListener('deeplink', (e) => {
      const { url } = JSON.parse((e as MessageEvent).data) as { url: string };
      pendingRef.current = url;
      setPendingUrl(url);
      location.hash = '#/home';
      toast('Lien reçu depuis le navigateur.', 'info');
    });
    return () => es.close();
  }, [toast, refreshStatus]);

  const value = useMemo<AppState>(
    () => ({
      page,
      go,
      status,
      settings,
      setSettings,
      jobs,
      library,
      refreshLibrary,
      connected,
      toasts,
      toast,
      playing,
      play: setPlaying,
      dark,
      toggleDark: () => setDark((d) => !d),
      urlInputRef,
      refreshStatus,
      pendingUrl,
      consumePendingUrl: () => {
        const u = pendingRef.current;
        pendingRef.current = null;
        setPendingUrl(null);
        return u;
      },
    }),
    [page, go, status, settings, jobs, library, refreshLibrary, connected, toasts, toast, playing, dark, refreshStatus, pendingUrl],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors AppProvider');
  return v;
}
