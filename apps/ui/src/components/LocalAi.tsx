import { useState } from 'react';
import { AlertTriangle, AudioLines, CheckCircle2, Download, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { WHISPER_LANGUAGES } from '@kayzen-flux/core';
import { api } from '../api';
import { bytes } from '../format';
import { useApp } from '../state';
import type { OllamaStatus, Settings, WhisperStatus, WhisperTarget } from '../types';

const PHASES: Record<NonNullable<WhisperStatus['installing']>['phase'], string> = {
  download: 'Téléchargement',
  verify: 'Vérification de l’empreinte SHA-256',
  extract: 'Décompression',
  check: 'Test du moteur',
};

const host = (url: string | null) => {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
};

/** Réglages « Transcription locale » (whisper.cpp) : installation à la demande, modèle, langue. */
export function LocalTranscriptionSettings({ draft, set, premium }: { draft: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void; premium: boolean }) {
  const { whisper, toast } = useApp();
  const [busy, setBusy] = useState(false);

  if (!whisper) return <p className="text-sm"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Chargement de l’état de la transcription locale…</p>;

  if (!whisper.supported) {
    return (
      <div className="flex gap-3 rounded-2xl bg-surface p-4 text-sm" role="note">
        <AlertTriangle className="h-5 w-5 shrink-0 text-gold" />
        <p>{whisper.unsupportedReason}</p>
      </div>
    );
  }

  const install = async (target: WhisperTarget, label: string, size: number, source: string | null, approx: boolean) => {
    const ok = window.confirm(
      `Télécharger ${label} (${approx ? 'environ ' : ''}${bytes(size)}) ?\n\n` +
        `Source officielle : ${host(source)}\n` +
        'Le fichier sera vérifié (empreinte SHA-256) puis conservé sur cet ordinateur. Vos médias, eux, ne quittent jamais l’ordinateur.',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.installWhisper(target, size);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const uninstall = async (target: WhisperTarget) => {
    if (!window.confirm('Supprimer ce composant de cet ordinateur ? Vous pourrez le télécharger à nouveau.')) return;
    try {
      await api.uninstallWhisper(target);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const inst = whisper.installing;
  const disabled = !premium || busy || inst !== null;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Sans sous-titres disponibles, KAYZEN Flux peut transcrire l’audio <strong className="text-ink">sur cet ordinateur</strong> avec whisper.cpp.
        Le moteur et le modèle sont téléchargés une seule fois, à votre demande, depuis leurs sources officielles.
      </p>

      {inst && (
        <div className="rounded-2xl bg-primary-soft/50 p-4" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-primary">{PHASES[inst.phase]} · {inst.target === 'engine' ? 'moteur' : `modèle ${inst.target}`}</span>
            <span className="tabular-nums">{bytes(inst.receivedBytes)} / {bytes(inst.totalBytes)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((inst.receivedBytes / Math.max(1, inst.totalBytes)) * 100)} aria-label="Téléchargement du composant de transcription">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all" style={{ width: `${Math.min(100, (inst.receivedBytes / Math.max(1, inst.totalBytes)) * 100)}%` }} />
          </div>
          <button className="mt-2 text-xs font-bold text-danger" onClick={() => api.cancelWhisperInstall().catch((e: Error) => toast(e.message, 'error'))}>Annuler le téléchargement</button>
        </div>
      )}
      {whisper.lastError && !inst && (
        <p className="flex items-start gap-2 rounded-2xl bg-danger/10 p-3 text-sm text-danger" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {whisper.lastError.message}</p>
      )}

      <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
        <ComponentRow
          title={`Moteur whisper.cpp (${whisper.engine.release})`}
          hint={`Programme officiel pour ${whisper.platform} · licence MIT`}
          size={whisper.engine.sizeBytes}
          approx
          installed={whisper.engine.installed}
          disabled={disabled}
          onInstall={() => install('engine', 'le moteur whisper.cpp', whisper.engine.sizeBytes ?? 0, whisper.engine.source, true)}
          onRemove={() => uninstall('engine')}
        />
        {whisper.models.map((m) => (
          <ComponentRow
            key={m.id}
            title={`Modèle ${m.label}${m.id === whisper.recommendedModel ? ' · conseillé pour cet ordinateur' : ''}`}
            hint={m.hint}
            size={m.sizeBytes}
            installed={m.installed}
            disabled={disabled}
            onInstall={() => install(m.id, `le modèle ${m.label}`, m.sizeBytes, m.source, false)}
            onRemove={() => uninstall(m.id)}
          />
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-display text-sm font-semibold text-ink">Modèle utilisé</span>
          <select className="input mt-1 py-2.5" value={draft.whisperModel} onChange={(e) => set('whisperModel', e.target.value as Settings['whisperModel'])}>
            {whisper.models.map((m) => <option key={m.id} value={m.id}>{m.label}{m.installed ? '' : ' (non installé)'}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-display text-sm font-semibold text-ink">Langue parlée</span>
          <select className="input mt-1 py-2.5" value={draft.whisperLanguage} onChange={(e) => set('whisperLanguage', e.target.value)}>
            {WHISPER_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs">
        {whisper.ready
          ? 'Prêt : les vidéos sans sous-titres seront transcrites localement quand l’option « Transcription automatique » est activée.'
          : 'Installez le moteur et au moins un modèle pour transcrire les vidéos sans sous-titres.'}
        {' '}La reconnaissance vocale peut faire des erreurs : la transcription le signale en en-tête.
      </p>
    </div>
  );
}

function ComponentRow(props: { title: string; hint: string; size: number | null; approx?: boolean; installed: boolean; disabled: boolean; onInstall: () => void; onRemove: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-ink">{props.title}</p>
        <p className="text-xs">{props.hint} · {props.approx ? '≈ ' : ''}{bytes(props.size)}</p>
      </div>
      {props.installed ? (
        <>
          <span className="chip text-ok"><CheckCircle2 className="h-3 w-3" /> Installé</span>
          <button className="icon-btn hover:text-danger" aria-label={`Supprimer : ${props.title}`} disabled={props.disabled} onClick={props.onRemove}><Trash2 className="h-4 w-4" /></button>
        </>
      ) : (
        <button className="btn-ghost px-3 py-1.5 text-sm" disabled={props.disabled} onClick={props.onInstall}><Download className="h-4 w-4" /> Télécharger</button>
      )}
    </li>
  );
}

/** Explication affichée quand aucun serveur Ollama local ne répond. */
export function OllamaHelp({ status }: { status: OllamaStatus | null }) {
  if (status?.available && !status.models.length) {
    return (
      <p className="text-sm">
        Ollama est lancé mais aucun modèle n’est installé. Dans un terminal, installez-en un, par exemple : <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">ollama pull mistral</code>
      </p>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p>Le résumé utilise <strong className="text-ink">Ollama</strong>, un logiciel gratuit qui exécute des modèles d’IA sur votre ordinateur. KAYZEN Flux ne l’inclut pas et n’envoie rien sur Internet.</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Installez Ollama depuis son site officiel : <span className="font-mono text-xs">ollama.com/download</span></li>
        <li>Téléchargez un modèle : <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">ollama pull mistral</code></li>
        <li>Laissez Ollama ouvert puis cliquez sur « Détecter ».</li>
      </ol>
    </div>
  );
}

/** Panneau « Résumer » d'une transcription : détection explicite d'Ollama sur 127.0.0.1 et choix du modèle. */
export function SummaryPanel({ itemId, premium, onStarted }: { itemId: string; premium: boolean; onStarted: () => void }) {
  const { toast } = useApp();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [model, setModel] = useState('');
  const [starting, setStarting] = useState(false);

  const detect = async () => {
    setDetecting(true);
    try {
      const s = await api.ollamaStatus();
      setStatus(s);
      setModel((m) => (s.models.some((x) => x.name === m) ? m : (s.models[0]?.name ?? '')));
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDetecting(false);
    }
  };

  const start = async () => {
    setStarting(true);
    try {
      await api.summarizeItem(itemId, model);
      toast('Résumé lancé : suivez-le dans Téléchargements.', 'info');
      onStarted();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setStarting(false);
    }
  };

  if (!premium) return <p className="text-xs">Le résumé local est inclus dans l’offre Premium.</p>;

  return (
    <div className="space-y-3">
      {status === null ? (
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={detect} disabled={detecting}>
          {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Résumer avec un modèle local…
        </button>
      ) : status.available && status.models.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[200px] flex-1">
            <span className="text-xs font-semibold text-ink">Modèle Ollama (sur cet ordinateur)</span>
            <select className="input mt-1 py-2" value={model} onChange={(e) => setModel(e.target.value)}>
              {status.models.map((m) => <option key={m.name} value={m.name}>{m.name}{m.parameterSize ? ` · ${m.parameterSize}` : ''}</option>)}
            </select>
          </label>
          <button className="btn-primary px-4 py-2 text-sm" onClick={start} disabled={starting || !model}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Résumer
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <OllamaHelp status={status} />
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={detect} disabled={detecting}>{detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Détecter</button>
        </div>
      )}
    </div>
  );
}

/** Bouton « Transcrire » d'un élément de la bibliothèque (seulement si la fonction existe sur cette plate-forme). */
export function TranscribeButton({ itemId, onNeedSetup }: { itemId: string; onNeedSetup: () => void }) {
  const { whisper, toast } = useApp();
  const [busy, setBusy] = useState(false);
  if (!whisper?.supported) return null;
  const run = async () => {
    if (!whisper.ready) {
      toast('Installez d’abord le moteur et un modèle de transcription (Paramètres).', 'info');
      onNeedSetup();
      return;
    }
    setBusy(true);
    try {
      await api.transcribeItem(itemId);
      toast('Transcription locale lancée : suivez-la dans Téléchargements.', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className="icon-btn" aria-label="Transcrire localement" title="Transcrire localement (sans sous-titres)" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
    </button>
  );
}

/** Affichage simple d'un Markdown produit par l'application (titres, puces, horodatages). */
export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink">
      {markdown.split('\n').filter((l) => l.trim() && !/^#\s/.test(l)).map((line, i) => {
        const ts = /^\*\*\[([^\]]+)\]\*\*\s?(.*)$/.exec(line);
        if (ts) return <p key={i}><span className="mr-2 rounded bg-primary-soft px-1.5 py-0.5 font-mono text-xs font-bold text-primary dark:text-white">{ts[1]}</span>{ts[2]}</p>;
        if (/^#{2,3}\s/.test(line)) return <h3 key={i} className="pt-2 font-display text-base font-bold">{line.replace(/^#+\s/, '')}</h3>;
        if (/^\s*[-*]\s/.test(line)) return <p key={i} className="pl-4 -indent-3">• {line.replace(/^\s*[-*]\s/, '').replace(/\*\*/g, '')}</p>;
        if (line.startsWith('>')) return <p key={i} className="rounded-xl bg-surface px-3 py-2 text-xs text-body">{line.replace(/^>\s?/, '')}</p>;
        if (/^(Source|Langue|Modèle)\s*:/.test(line)) return <p key={i} className="text-xs text-body">{line.replace(/\s+$/, '')}</p>;
        return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}
