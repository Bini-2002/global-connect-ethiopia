export interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
  iat?: number;
}

let inMemoryToken: string | null = null;

function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase().replace(/-/g, '_');
  const normalizedSpaces = normalized.replace(/_/g, ' ');
  const aliases: Record<string, string> = {
    superadmin: 'super_admin',
    'super admin': 'super_admin',
    administrator: 'admin',
    organiser: 'organizer',
    'event organizer': 'organizer',
    event_organizer: 'organizer',
    'event management organizer': 'organizer',
    ministry: 'ministry_gov',
    'ministry gov': 'ministry_gov',
    municipal: 'municipal_gov',
    municipality: 'municipal_gov',
    'municipal gov': 'municipal_gov',
  };

  return aliases[normalized] ?? aliases[normalizedSpaces] ?? normalized;
}

export function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeToken(token);
  return normalizeRole(payload?.role ?? null);
}

interface VendorVerificationStatus {
  status?: string;
  verification_status?: string;
}

function vendorIsApproved(status?: VendorVerificationStatus): boolean {
  if (!status) return false;

  return (
    status.verification_status === "approved" ||
    status.status === "approved"
  );
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalizedPayload.length % 4)) % 4);
    const decoded = JSON.parse(atob(`${normalizedPayload}${padding}`));
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'gce_';
const ACCESS_TOKEN_KEY = 'access_token';
const TOKEN_TYPE_KEY = 'token_type';
const SESSION_HINT_KEY = 'session_active';

function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(sessionStorage.getItem(STORAGE_KEY + SESSION_HINT_KEY) || localStorage.getItem(STORAGE_KEY + SESSION_HINT_KEY));
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function setCookieValue(name: string, value: string, persistent: boolean): void {
  if (typeof document === 'undefined') return;

  const maxAge = persistent ? '; Max-Age=2592000' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${maxAge}`;
}

function clearCookieValue(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getStorageToken(storage: Storage): string | null {
  return (
    storage.getItem(STORAGE_KEY + 'access_token') ||
    storage.getItem(ACCESS_TOKEN_KEY)
  );
}

function clearStorageTokens(storage: Storage): void {
  storage.removeItem(STORAGE_KEY + ACCESS_TOKEN_KEY);
  storage.removeItem(STORAGE_KEY + TOKEN_TYPE_KEY);
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(TOKEN_TYPE_KEY);
}

function setStorageTokens(storage: Storage, token: string, tokenType: string): void {
  storage.setItem(STORAGE_KEY + ACCESS_TOKEN_KEY, token);
  storage.setItem(STORAGE_KEY + TOKEN_TYPE_KEY, tokenType);
  storage.setItem(ACCESS_TOKEN_KEY, token);
  storage.setItem(TOKEN_TYPE_KEY, tokenType);
}

function isTokenUsable(token: string | null): token is string {
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;
  if (!payload?.exp) return true;
  return Date.now() / 1000 < payload.exp;
}

function getStoredTokenCandidates(): string[] {
  if (typeof window === 'undefined') return [];

  const sessionToken = getStorageToken(sessionStorage);
  const localToken = getStorageToken(localStorage);
  const cookieToken =
    getCookieValue(STORAGE_KEY + ACCESS_TOKEN_KEY) || getCookieValue(ACCESS_TOKEN_KEY);

  return [sessionToken, localToken, cookieToken, inMemoryToken].filter(
    (token): token is string => typeof token === 'string' && token.trim().length > 0,
  );
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const candidates = getStoredTokenCandidates();
  const usableToken = candidates.find((token) => isTokenUsable(token));

  if (usableToken) {
    inMemoryToken = usableToken;
    return usableToken;
  }

  if (candidates.length > 0) {
    clearStorageTokens(localStorage);
    clearStorageTokens(sessionStorage);
    clearCookieValue(STORAGE_KEY + ACCESS_TOKEN_KEY);
    clearCookieValue(ACCESS_TOKEN_KEY);
    clearCookieValue(STORAGE_KEY + TOKEN_TYPE_KEY);
    clearCookieValue(TOKEN_TYPE_KEY);
  }

  inMemoryToken = null;
  return null;
}

export async function waitForToken(
  timeoutMs = 750,
  intervalMs = 50,
): Promise<string | null> {
  const token = getToken();
  if (token) return token;

  if (typeof window === 'undefined') return null;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    const nextToken = getToken();
    if (nextToken) return nextToken;
  }

  return null;
}

export function getRole(): string | null {
  return getRoleFromToken(getToken());
}

export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return hasSessionHint();
  const payload = decodeToken(token);
  if (!payload) return hasSessionHint();
  return Date.now() / 1000 < payload.exp;
}

export function logout(): void {
  if (typeof window === 'undefined') return;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  void fetch(`${apiBase}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
  }).catch(() => {
    // best effort cleanup; local state clearing still proceeds
  });

  inMemoryToken = null;
  clearStorageTokens(localStorage);
  clearStorageTokens(sessionStorage);
  localStorage.removeItem(STORAGE_KEY + SESSION_HINT_KEY);
  sessionStorage.removeItem(STORAGE_KEY + SESSION_HINT_KEY);
  clearCookieValue(STORAGE_KEY + ACCESS_TOKEN_KEY);
  clearCookieValue(ACCESS_TOKEN_KEY);
  clearCookieValue(STORAGE_KEY + TOKEN_TYPE_KEY);
  clearCookieValue(TOKEN_TYPE_KEY);
}

export function saveAuthSession(token: string, tokenType: string, persistent = false): void {
  if (typeof window === 'undefined') return;

  clearStorageTokens(localStorage);
  clearStorageTokens(sessionStorage);
  clearCookieValue(STORAGE_KEY + ACCESS_TOKEN_KEY);
  clearCookieValue(ACCESS_TOKEN_KEY);
  clearCookieValue(STORAGE_KEY + TOKEN_TYPE_KEY);
  clearCookieValue(TOKEN_TYPE_KEY);

  const storage = persistent ? localStorage : sessionStorage;
  setStorageTokens(storage, token, tokenType);
  storage.setItem(STORAGE_KEY + SESSION_HINT_KEY, '1');
  setCookieValue(STORAGE_KEY + ACCESS_TOKEN_KEY, token, persistent);
  setCookieValue(ACCESS_TOKEN_KEY, token, persistent);
  setCookieValue(STORAGE_KEY + TOKEN_TYPE_KEY, tokenType, persistent);
  setCookieValue(TOKEN_TYPE_KEY, tokenType, persistent);
  inMemoryToken = token;
}

export async function getOrganizerPortalRoute(tokenOverride?: string | null): Promise<string> {
  const token = tokenOverride ?? getToken();

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/organizers/verification-status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
      cache: 'no-store',
    });

    if (res.status === 401) {
      logout();
      return '/login';
    }

    return '/organizer/dashboard';
  } catch {
    return '/organizer/dashboard';
  }
}

export async function getVendorPortalRoute(tokenOverride?: string | null): Promise<string> {
  const token = tokenOverride ?? getToken();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  try {
    const res = await fetch(`${apiBase}/vendors/verification/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
      cache: 'no-store',
    });

    if (res.status === 401) {
      logout();
      return '/login';
    }

    if (res.status === 404) {
      return '/vendor/verification';
    }

    if (!res.ok) {
      return '/vendor/verification';
    }

    const data = (await res.json()) as VendorVerificationStatus;
    if (vendorIsApproved(data)) {
      return '/vendor/dashboard';
    }

    if (data.verification_status === 'pending_for_review') {
      return '/vendor/under-review';
    }

    return '/vendor/verification';
  } catch {
    return '/vendor/verification';
  }
}

export const ROLE_DASHBOARDS: Record<string, string> = {
  organizer: '/organizer/dashboard',
  vendor: '/vendor/verification',
  admin: '/admin/organizers',
  super_admin: '/admin/organizers',
  ministry_gov: '/ministry/proposals',
  municipal_gov: '/municipal/proposals',
  police: '/police/proposals',
  attendee: '/',
  team_member: '/team/dashboard',
};
