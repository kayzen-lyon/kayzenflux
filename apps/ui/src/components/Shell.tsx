import { AlertTriangle, BellRing, CheckCircle2, Download, FolderDown, Info, Keyboard, Library, Moon, Settings2, Sun, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../state';
import type { Page } from '../types';
import { isActive } from '../format';
import { PlayerBar } from './PlayerBar';
import { UpdateBanner } from './UpdateBanner';
import { PRESET_KIND } from './presetKind';

const NAV: Array<{ id: Page; label: string; icon: typeof Download }> = [
  { id: 'home', label: 'Convertir', icon: Download },
  { id: 'downloads', label: 'Téléchargements', icon: FolderDown },
  { id: 'library', label: 'Bibliothèque', icon: Library },
  { id: 'subscriptions', label: 'Abonnements', icon: BellRing },
  { id: 'settings', label: 'Paramètres', icon: Settings2 },
  { id: 'shortcuts', label: 'Raccourcis', icon: Keyboard },
];

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[10px] bg-primary text-on-primary ${className}`}>
      <svg viewBox="0 0 64 64" className="h-1/2 w-1/2" aria-hidden="true">
        <path d="M14 12h10v40H14zM28 32l22-20v40z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <span className="whitespace-nowrap font-display text-[1.1875rem] leading-none tracking-tight text-rail-ink">
        <span className="font-extrabold">KAYZEN</span> <span className="font-normal">Flux</span>
      </span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { page, go, status, jobs, connected, dark, toggleDark, playing, playerExpanded } = useApp();
  const active = jobs.filter((j) => isActive(j.phase)).length;
  const videoDock = !!playing && PRESET_KIND[playing.preset] === 'video' && playerExpanded;
  const bottomPad = !playing ? 'pb-16' : videoDock ? 'pb-64' : 'pb-36';

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-rail dark:border-r dark:border-white/[0.06] px-4 pb-5 pt-6 text-rail-muted lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-10 flex flex-col gap-0.5" aria-label="Navigation principale">
          {NAV.map(({ id, label, icon: Icon }) => {
            const current = page === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={current ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-display text-[0.9375rem] transition duration-150 focus-visible:outline-rail-ink ${
                  current ? 'bg-white/[0.07] font-semibold text-rail-ink' : 'font-medium hover:bg-white/[0.04] hover:text-rail-ink'
                }`}
              >
                <span aria-hidden="true" className={`absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity ${current ? 'opacity-100' : 'opacity-0'}`} />
                <Icon className={`h-[18px] w-[18px] ${current ? 'text-primary' : ''}`} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {id === 'downloads' && active > 0 && (
                  <span className="min-w-[1.375rem] rounded-full bg-primary px-1.5 py-px text-center text-meta font-bold tabular-nums text-on-primary" aria-label={`${active} en cours`}>{active}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          <div className="border-t border-white/10 pt-4 text-small">
            <p className="flex items-center gap-2 font-semibold text-rail-ink">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#5CC98A]' : 'bg-[#F2877B]'}`} aria-hidden="true" />
              {connected ? 'Moteur local connecté' : 'Moteur local hors ligne'}
            </p>
            <p className="mt-1 pl-4 text-meta">{status?.engine ? `yt-dlp ${status.engine}` : 'yt-dlp introuvable'}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-meta leading-snug">Tout reste sur cet ordinateur.</p>
            <button
              onClick={toggleDark}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rail-muted transition hover:bg-white/[0.06] hover:text-rail-ink focus-visible:outline-rail-ink"
              aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-rail px-4 py-2.5 lg:hidden">
          <LogoMark className="h-8 w-8" />
          <nav className="flex gap-1 overflow-x-auto" aria-label="Navigation">
            {NAV.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={page === id ? 'page' : undefined}
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${page === id ? 'bg-white/10 text-primary' : 'text-rail-muted hover:text-rail-ink'}`}
                aria-label={label}
                title={label}
              >
                <Icon className="h-4 w-4" />
                {id === 'downloads' && active > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))}
          </nav>
          <button onClick={toggleDark} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-rail-muted hover:text-rail-ink" aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <UpdateBanner />
        <main className={`mx-auto w-full max-w-[68rem] flex-1 px-5 pt-10 md:px-10 ${bottomPad}`}>{children}</main>
      </div>
      <PlayerBar />
      <Toasts />
    </div>
  );
}

/** En-tête de page : titre, phrase d'explication, actions à droite. */
export function PageHeader({ title, lead, actions, meta }: { title: string; lead?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-hairline pb-6">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-small">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex animate-[toast-in_180ms_ease-out] items-start gap-3 rounded-xl border border-hairline border-l-[3px] bg-card px-4 py-3 text-small text-ink shadow-lift ${
            t.kind === 'error' ? 'border-l-danger' : t.kind === 'success' ? 'border-l-ok' : 'border-l-primary'
          }`}
        >
          {t.kind === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          <span className="flex-1">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Interrupteur accessible (case à cocher native, rendue sous forme de bascule). */
export function Toggle({ checked, onChange, label, hint, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-4 py-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-small">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-ink/20 transition-colors duration-150 after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-150 peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      />
    </label>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-hairline bg-card text-primary">{icon}</div>
      <h2 className="mt-5 text-lead font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-small">{text}</p>
      {action && <div className="mt-6">{action}</div>}
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
