import type { Job, LibraryItem, LicenseState, MediaInfo, OllamaStatus, PresetId, Settings, Status, Subscription, UpdateState, WhisperStatus, WhisperTarget } from './types';

const token = document.querySelector<HTMLMetaElement>('meta[name="kayzen-token"]')?.content ?? '';
// En développement (Vite), le jeton peut être fourni par ?token= dans l'URL.
export const sessionToken = token.startsWith('__') ? (new URLSearchParams(location.search).get('token') ?? '') : token;

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'x-kayzen-token': sessionToken, ...(body !== undefined || method !== 'GET' ? { 'content-type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Le moteur local ne répond pas. Est-il lancé ?', 'offline', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Erreur inattendue.', data.code ?? 'error', res.status);
  return data as T;
}

export interface JobInput {
  url: string;
  preset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  subtitles: boolean;
  playlist: boolean;
  info: MediaInfo | null;
  splitChapters?: boolean;
  normalizeAudio?: boolean;
  transcript?: boolean;
}

export const api = {
  status: () => call<Status>('GET', '/api/status'),
  info: (url: string, playlist = false) => call<MediaInfo>('POST', '/api/info', { url, playlist }),
  jobs: () => call<Job[]>('GET', '/api/jobs'),
  createJob: (input: JobInput) => call<Job>('POST', '/api/jobs', input),
  cancelJob: (id: string) => call<{ ok: true }>('POST', `/api/jobs/${id}/cancel`, {}),
  removeJob: (id: string) => call<{ ok: true }>('DELETE', `/api/jobs/${id}`),
  library: () => call<LibraryItem[]>('GET', '/api/library'),
  favorite: (id: string, favorite: boolean) => call<LibraryItem>('PATCH', `/api/library/${id}`, { favorite }),
  removeItem: (id: string, deleteFile: boolean) => call<{ ok: true }>('DELETE', `/api/library/${id}${deleteFile ? '?deleteFile=1' : ''}`),
  clearLibrary: () => call<{ ok: true }>('DELETE', '/api/library'),
  reveal: (id: string) => call<{ ok: true }>('POST', `/api/library/${id}/reveal`, {}),
  openFolder: () => call<{ ok: true }>('POST', '/api/folder/open', {}),
  settings: () => call<Settings>('GET', '/api/settings'),
  saveSettings: (s: Partial<Settings>) => call<Settings>('PUT', '/api/settings', s),
  activateLicense: (key: string) => call<LicenseState>('POST', '/api/license', { key }),
  deactivateLicense: () => call<LicenseState>('DELETE', '/api/license'),
  subscriptions: () => call<Subscription[]>('GET', '/api/subscriptions'),
  addSubscription: (s: { url: string; preset: PresetId; intervalHours: number; downloadLatest: number }) => call<Subscription>('POST', '/api/subscriptions', s),
  updateSubscription: (id: string, patch: Partial<Pick<Subscription, 'enabled' | 'preset' | 'intervalHours'>>) => call<Subscription>('PATCH', `/api/subscriptions/${id}`, patch),
  removeSubscription: (id: string) => call<{ ok: true }>('DELETE', `/api/subscriptions/${id}`),
  checkSubscription: (id: string) => call<{ found: number }>('POST', `/api/subscriptions/${id}/check`, {}),
  transcript: (id: string) => call<{ markdown: string; path: string }>('GET', `/api/library/${id}/transcript`),
  summary: (id: string) => call<{ markdown: string; path: string }>('GET', `/api/library/${id}/summary`),
  transcribeItem: (id: string) => call<Job>('POST', `/api/library/${id}/transcribe`, {}),
  summarizeItem: (id: string, model: string) => call<Job>('POST', `/api/library/${id}/summarize`, { model }),
  whisperStatus: () => call<WhisperStatus>('GET', '/api/whisper'),
  /** `confirmedBytes` = taille montrée à l'utilisateur et acceptée par lui. */
  installWhisper: (target: WhisperTarget, confirmedBytes: number) => call<WhisperStatus>('POST', '/api/whisper/install', { target, confirmedBytes }),
  cancelWhisperInstall: () => call<{ ok: true }>('POST', '/api/whisper/cancel', {}),
  uninstallWhisper: (target: WhisperTarget) => call<WhisperStatus>('DELETE', `/api/whisper/${target}`),
  ollamaStatus: () => call<OllamaStatus>('GET', '/api/ollama'),
  updateEngine: () => call<{ ok: boolean; output: string }>('POST', '/api/engine/update', {}),
  appUpdate: () => call<UpdateState>('GET', '/api/update'),
  checkAppUpdate: () => call<UpdateState>('POST', '/api/update/check', {}),
  installAppUpdate: () => call<{ ok: true }>('POST', '/api/update/install', {}),
};

export const mediaUrl = (id: string) => `/media/${encodeURIComponent(id)}?token=${encodeURIComponent(sessionToken)}`;
export const eventsUrl = () => `/api/events?token=${encodeURIComponent(sessionToken)}`;
