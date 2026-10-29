/**
 * Centralised API configuration.
 *
 * The base URL is supplied by VITE_API_BASE_URL and must include the
 * `/api` prefix used by the FastAPI router (app/api/router.py).
 *
 * Only public, browser-safe values live here. No Supabase service-role
 * key, database password or other server secret is ever bundled into the
 * frontend.
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * The base URL is trimmed because a stray space or newline in the .env file
 * (a common mistake with `set VAR=value && ...` or a CRLF line ending)
 * would otherwise be baked into every request URL.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL
)
  .trim()
  .replace(/\/+$/, '');

/** Root URL of the backend, without the `/api` router prefix. */
export const API_ROOT_URL = API_BASE_URL.replace(/\/api$/, '');

export const TOKEN_STORAGE_KEY = 'medigurdian.access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'medigurdian.refresh_token';
export const USER_STORAGE_KEY = 'medigurdian.user';

/* =========================================================
   TOKEN HELPERS
   The access token is the Supabase JWT issued by the backend
   `/api/auth/login` and `/api/auth/signup` endpoints. It is
   required in the `Authorization: Bearer <token>` header by
   every protected backend route.
   ========================================================= */

export function getAccessToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setTokens({ accessToken, refreshToken } = {}) {
  try {
    if (accessToken) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    }
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

export function getRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

/* =========================================================
   ERROR NORMALISATION
   FastAPI returns `detail` either as a string (HTTPException) or
   as a list of validation objects (422). Both are flattened into
   a single human readable message.
   ========================================================= */

export function extractErrorMessage(payload, fallback) {
  if (!payload) return fallback;

  if (typeof payload === 'string') return payload;

  const detail = payload.detail ?? payload.message ?? payload.error;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.msg === 'string') {
          const field = Array.isArray(item.loc)
            ? item.loc[item.loc.length - 1]
            : null;
          return field ? `${field}: ${item.msg}` : item.msg;
        }
        return null;
      })
      .filter(Boolean);

    if (messages.length) return messages.join('. ');
  }

  return fallback;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}
