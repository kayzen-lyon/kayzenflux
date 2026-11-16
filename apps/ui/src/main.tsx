import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppProvider, useApp } from './state';
import { Shell } from './components/Shell';
import { HomePage } from './pages/Home';
import { DownloadsPage } from './pages/Downloads';
import { LibraryPage } from './pages/Library';
import { SettingsPage } from './pages/Settings';
import { ShortcutsPage } from './pages/Shortcuts';
import type { Page } from './types';

function GlobalShortcuts() {
  const { go, urlInputRef } = useApp();
  useEffect(() => {
    let pendingG = false;
    let timer: number | undefined;
    const map: Record<string, Page> = { h: 'home', d: 'downloads', b: 'library', s: 'settings' };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        go('home');
        setTimeout(() => urlInputRef.current?.focus(), 50);
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '?') return go('shortcuts');
      if (pendingG && map[e.key]) {
        pendingG = false;
        return go(map[e.key]!);
      }
      if (e.key === 'g') {
        pendingG = true;
        clearTimeout(timer);
        timer = window.setTimeout(() => (pendingG = false), 1000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, urlInputRef]);
  return null;
}

function Router() {
  const { page } = useApp();
  switch (page) {
    case 'downloads':
      return <DownloadsPage />;
    case 'library':
      return <LibraryPage />;
    case 'settings':
      return <SettingsPage />;
    case 'shortcuts':
      return <ShortcutsPage />;
    default:
      return <HomePage />;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <GlobalShortcuts />
      <Shell>
        <Router />
      </Shell>
    </AppProvider>
  </StrictMode>,
);
