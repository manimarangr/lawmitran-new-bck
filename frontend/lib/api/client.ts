import { API_BASE } from './base';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// Silent session refresh: refresh tokens are single-use server-side, so all
// concurrent 401s share ONE refresh call (single-flight).
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
        if (!data.accessToken || !data.refreshToken) return false;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

async function doFetch(path: string, init?: RequestInit) {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
}

/**
 * Authenticated fetch — attaches the bearer token; on 401 it silently refreshes
 * the session and retries once before redirecting to /login.
 */
export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  if (res.status === 401 && (await refreshSession())) {
    res = await doFetch(path, init); // retry once with the fresh token
  }

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      // Send them back to where they were after signing in.
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?next=${next}`;
    }
    throw new Error('Session expired — please sign in again');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { message?: string })?.message ?? 'Request failed');
  }
  return body as T;
}
