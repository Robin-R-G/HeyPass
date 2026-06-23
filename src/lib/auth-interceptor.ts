'use client';

export function initAuthInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only add auth headers for same-origin API calls
    if (url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')) {
      const token = localStorage.getItem('access_token');
      if (token) {
        init = init || {};
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await originalFetch.call(window, input, init);

    // If 401, clear tokens and redirect to login
    if (response.status === 401 && url.startsWith('/api/') && !url.includes('/api/auth/')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth/login';
    }

    return response;
  };
}
