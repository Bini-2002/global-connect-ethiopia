import { getToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith('/api/')) {
    if (/^https?:\/\//i.test(BASE_URL)) {
      const base = new URL(BASE_URL);
      return `${base.origin}${path}`;
    }
    return path;
  }

  return `${BASE_URL}${path}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(resolveUrl(path), { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === 'string'
        ? err.detail
        : JSON.stringify(err.detail) || 'Request failed'
    );
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

async function requestBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(resolveUrl(path), { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === 'string'
        ? err.detail
        : JSON.stringify(err.detail) || 'Request failed'
    );
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string) => requestBlob(path),
  resolveUrl,
};

export default api;
