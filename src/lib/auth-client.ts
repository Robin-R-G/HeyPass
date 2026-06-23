'use client';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function checkAndRefreshTokens(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Refresh if expired or expiring within 30 seconds
    if (payload.exp && Date.now() + 30000 >= payload.exp * 1000) {
      if (!refreshToken) {
        clearTokens();
        return null;
      }
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      const newTokens = data.data?.session || data.session;
      if (newTokens?.access_token) {
        localStorage.setItem('access_token', newTokens.access_token);
        localStorage.setItem('refresh_token', newTokens.refresh_token);
        return newTokens.access_token;
      }
      clearTokens();
      return null;
    }
    return token;
  } catch {
    clearTokens();
    return null;
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await checkAndRefreshTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearTokens();
    window.location.href = '/auth/login';
    throw new Error('Unauthorized');
  }

  return res;
}

