export interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
  iat?: number;
}

interface OrganizerVerificationStatus {
  profile_type?: "organization" | "individual";
  onboarding_status?: string;
  status?: string;
  verification_status?: string;
}

function organizerIsApproved(status?: OrganizerVerificationStatus): boolean {
  if (!status) return false;

  return (
    status.verification_status === "approved" ||
    status.status === "approved"
  );
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

export async function getOrganizerPortalRoute(): Promise<string> {
  const token = getToken();
  if (!token) return '/login';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  try {
    const res = await fetch(`${apiBase}/organizers/verification-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      return '/login';
    }

    if (res.status === 404) {
      return '/organizer/register';
    }

    if (!res.ok) {
      return '/organizer/register';
    }

    const data = (await res.json()) as OrganizerVerificationStatus;
    if (organizerIsApproved(data)) {
      return '/organizer/dashboard';
    }

    if (data.verification_status === 'pending_for_review') {
      return '/organizer/under-review';
    }

    return '/organizer/register';
  } catch {
    return '/organizer/register';
  }
}

export async function getVendorPortalRoute(): Promise<string> {
  const token = getToken();
  if (!token) return '/login';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  try {
    const res = await fetch(`${apiBase}/vendors/verification/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
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
  admin: '/admin/proposals',
  super_admin: '/admin/proposals',
  ministry_gov: '/ministry/proposals',
  municipal_gov: '/municipal/proposals',
  police: '/police/proposals',
  attendee: '/',
};
