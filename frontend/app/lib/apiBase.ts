const DEFAULT_API_BASE_URL = "https://global-connect-5kcx.onrender.com/api/v1";
const DEFAULT_BACKEND_ORIGIN = "https://global-connect-5kcx.onrender.com";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function getBackendOrigin(): string {
  return (process.env.BACKEND_ORIGIN || DEFAULT_BACKEND_ORIGIN).replace(/\/$/, "");
}