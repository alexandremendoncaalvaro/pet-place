type ImportMetaWithEnv = ImportMeta & {
  env: {
    VITE_API_URL?: string;
  };
};

export const API_BASE = ((import.meta as ImportMetaWithEnv).env.VITE_API_URL || '').replace(/\/$/, '');

export type ApiError = Error & { status?: number };

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const hasForm = init.body instanceof FormData;
  if (!hasForm && init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return await res.json() as T;
}

export async function toApiError(res: Response): Promise<ApiError> {
  let message = `Erro HTTP ${res.status}`;
  try {
    const data = await res.json() as { error?: string };
    message = data.error || message;
  } catch {
    message = await res.text() || message;
  }
  const error = new Error(message) as ApiError;
  error.status = res.status;
  return error;
}
