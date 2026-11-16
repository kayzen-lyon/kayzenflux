import type { Job, LibraryItem, MediaInfo, PresetId, Settings, Status } from './types';

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
  updateEngine: () => call<{ ok: boolean; output: string }>('POST', '/api/engine/update', {}),
};

export const mediaUrl = (id: string) => `/media/${encodeURIComponent(id)}?token=${encodeURIComponent(sessionToken)}`;
export const eventsUrl = () => `/api/events?token=${encodeURIComponent(sessionToken)}`;
