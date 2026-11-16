import { BellRing, Download, FolderDown, Keyboard, Library, Moon, Settings2, Sun, WifiOff, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../state';
import type { Page } from '../types';
import { isActive } from '../format';
import { PlayerBar } from './PlayerBar';

const NAV: Array<{ id: Page; label: string; icon: typeof Download }> = [
  { id: 'home', label: 'Accueil & Convertisseur', icon: Download },
  { id: 'downloads', label: 'Téléchargements', icon: FolderDown },
  { id: 'library', label: 'Bibliothèque & Lecteur', icon: Library },
  { id: 'subscriptions', label: 'Abonnements', icon: BellRing },
  { id: 'settings', label: 'Moteur & Paramètres', icon: Settings2 },
  { id: 'shortcuts', label: 'Raccourcis clavier', icon: Keyboard },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
          <path d="M14 12h10v40H14zM28 32l22-20v40z" fill="currentColor" />
        </svg>
      </span>
      <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-ink">
        KAYZEN <span className="text-primary">Flux</span>
      </span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { page, go, status, jobs, connected, dark, toggleDark, playing } = useApp();
  const active = jobs.filter((j) => isActive(j.phase)).length;

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-hairline bg-card px-5 py-6 lg:flex">
        <Logo />
        <div className="mt-6 flex items-center justify-between rounded-full bg-surface px-3 py-1.5 text-xs">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <span className={`h-2 w-2 rounded-full ${status?.engine ? 'bg-ok' : 'bg-danger'}`} />
            yt-dlp {status?.engine ?? 'introuvable'}
          </span>
          <span className={`font-bold ${status?.engine ? 'text-primary' : 'text-danger'}`}>{status?.engine ? 'Actif' : 'À installer'}</span>
        </div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={page === id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium transition ${
                page === id ? 'bg-primary-soft font-semibold text-primary dark:text-white' : 'text-ink/80 hover:bg-surface'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
              {id === 'downloads' && active > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{active}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2">
            <span className="flex items-center gap-2">
              {connected ? <CheckCircle2 className="h-4 w-4 text-ok" /> : <WifiOff className="h-4 w-4 text-danger" />}
              Moteur local
            </span>
            <span className="font-bold text-ink">{connected ? 'Connecté' : 'Hors ligne'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2">
            <span>Offre</span>
            <span className="font-bold text-primary">{status?.tier === 'premium' ? 'Premium' : 'Gratuite'}</span>
          </div>
          <p className="px-1 pt-1 text-[11px] leading-relaxed text-body/80">Tout reste sur cet ordinateur : 0 compte, 0 pistage, 0 publicité.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hairline bg-bg/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="hidden sm:block lg:hidden">
            <Logo />
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:hidden" aria-label="Navigation mobile">
            {NAV.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => go(id)} className={`icon-btn ${page === id ? 'bg-primary-soft text-primary' : ''}`} aria-label={label}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => go('downloads')} className="relative icon-btn" aria-label={`${active} téléchargement(s) en cours`}>
              <FolderDown className="h-5 w-5" />
              {active > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{active}</span>}
            </button>
            <button onClick={toggleDark} className="icon-btn" aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="hidden rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink sm:inline">Session locale · 0 pistage</span>
          </div>
        </header>
        <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 ${playing ? 'pb-36' : ''}`}>{children}</main>
      </div>
      <PlayerBar />
      <Toasts />
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-lift ${
          t.kind === 'error' ? 'border-danger/30 bg-card text-danger' : t.kind === 'success' ? 'border-ok/30 bg-card text-ink' : 'border-hairline bg-card text-ink'
        }`}>
          {t.kind === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-4">
      <span className="flex-1">
        <span className="block font-display text-[15px] font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-hairline transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CloseBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="icon-btn" aria-label={label}>
      <X className="h-4 w-4" />
    </button>
  );
}
