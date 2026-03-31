/**
 * Auth helpers — store and read JWT from cookies (client-side).
 * Uses document.cookie rather than a library to keep dependencies minimal.
 */

import { api } from './api';

const TOKEN_KEY = 'i18n_token';
const USER_KEY = 'i18n_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Persist a JWT token in a browser cookie and configure the API client.
 * @param token - Bearer token returned by the login/register endpoint
 * @param user - User info to cache in a separate cookie
 */
export function saveAuth(token: string, user: StoredUser): void {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Lax`;
  api.setToken(token);
}

/**
 * Read and return the stored JWT token from cookies, or null if not present.
 */
export function getToken(): string | null {
  return getCookie(TOKEN_KEY);
}

/**
 * Read and return the stored user from cookies, or null if not present.
 */
export function getStoredUser(): StoredUser | null {
  const raw = getCookie(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as StoredUser;
  } catch {
    return null;
  }
}

/**
 * Remove auth cookies and clear the API token.
 * Call this on logout.
 */
export function clearAuth(): void {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0`;
  api.clearToken();
}

/**
 * Initialize the API client from the stored cookie.
 * Call this once on app bootstrap (e.g., in a root layout useEffect).
 * Returns true if a token was found and applied.
 */
export function hydrateAuth(): boolean {
  const token = getToken();
  if (token) {
    api.setToken(token);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=') : null;
}
