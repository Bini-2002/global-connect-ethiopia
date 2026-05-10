import { getToken, logout } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const inflight = new Map<string, Promise<unknown>>();

type ApiRequestInit = RequestInit & {
  authToken?: string | null;
};

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

function inflightKey(path: string, options: ApiRequestInit = {}): string | null {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') return null;
  const token = options.authToken ?? getToken();
  return `${method}:${resolveUrl(path)}:${token || ''}`;
}

async function request<T>(
  path: string,
  options: ApiRequestInit = {}
): Promise<T> {
  const key = inflightKey(path, options);
  if (key && inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const promise = executeRequest<T>(path, options);
  if (key) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }
  return promise;
}

async function executeRequest<T>(
  path: string,
  options: ApiRequestInit = {}
): Promise<T> {
  const runRequest = async (token: string | null, includeAuthHeader = true) => {
    const headers: HeadersInit = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(includeAuthHeader && token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    return fetch(resolveUrl(path), { ...options, headers, credentials: 'include' });
  };

  const initialToken = options.authToken ?? getToken();
  let res = await runRequest(initialToken);

  if (res.status === 401) {
    const refreshedToken = getToken();
    if (refreshedToken && refreshedToken !== initialToken) {
      res = await runRequest(refreshedToken);
    }
  }

  if (res.status === 401) {
    // Final fallback: rely on server-side session cookie without Authorization header.
    res = await runRequest(null, false);
  }

  if (res.status === 401) {
    logout();
    throw new Error('Not authenticated');
  }

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
  options: ApiRequestInit = {}
): Promise<Blob> {
  const runRequest = async (token: string | null, includeAuthHeader = true) => {
    const headers: HeadersInit = {
      ...(includeAuthHeader && token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    return fetch(resolveUrl(path), { ...options, headers, credentials: 'include' });
  };

  const initialToken = options.authToken ?? getToken();
  let res = await runRequest(initialToken);

  if (res.status === 401) {
    const refreshedToken = getToken();
    if (refreshedToken && refreshedToken !== initialToken) {
      res = await runRequest(refreshedToken);
    }
  }

  if (res.status === 401) {
    // Final fallback: rely on server-side session cookie without Authorization header.
    res = await runRequest(null, false);
  }

  if (res.status === 401) {
    logout();
    throw new Error('Not authenticated');
  }

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
  get: <T>(path: string, options?: ApiRequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options: ApiRequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown, options: ApiRequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, options: ApiRequestInit = {}) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string, options: ApiRequestInit = {}) => request<T>(path, { ...options, method: 'DELETE' }),
  getBlob: (path: string, options?: ApiRequestInit) => requestBlob(path, options),
  resolveUrl,
};

export default api;
