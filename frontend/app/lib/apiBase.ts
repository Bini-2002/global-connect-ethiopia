const DEFAULT_API_BASE_URL = "https://global-connect-5kcx.onrender.com/api/v1";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function getBackendOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/v1$/, "");
}