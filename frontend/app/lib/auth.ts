export interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
  iat?: number;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'gce_';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY + 'access_token') || 
         localStorage.getItem(STORAGE_KEY + 'access_token');
}

export function getRole(): string | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return payload?.role ?? null;
}

export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;
  return Date.now() / 1000 < payload.exp;
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY + 'access_token');
  localStorage.removeItem(STORAGE_KEY + 'token_type');
  sessionStorage.removeItem(STORAGE_KEY + 'access_token');
  sessionStorage.removeItem(STORAGE_KEY + 'token_type');
}

export const ROLE_DASHBOARDS: Record<string, string> = {
  organizer: '/organizer/dashboard',
  vendor: '/vendor/verification',
  admin: '/admin/proposals',
  super_admin: '/admin/proposals',
  ministry_gov: '/ministry/proposals',
  municipal_gov: '/municipal/proposals',
  police: '/police/proposals',
  attendee: '/',
};
