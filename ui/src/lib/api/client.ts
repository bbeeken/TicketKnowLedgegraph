import Router from 'next/router';

// API base URL configuration
// Prefer public base in browser; allow INTERNAL_API_BASE_URL for SSR or server contexts
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const INTERNAL_BASE = process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const API_BASE_URL = typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE;

// Centralized API fetch helper
// - Automatically attaches Authorization header if token in localStorage (browser only)
// - Handles 401 by redirecting to /login
// - Parses JSON and throws enriched Error containing status & body
// - Automatic token refresh for expired tokens
export interface ApiError extends Error {
  status: number;
  body?: any;
}

export interface ApiFetchOptions extends RequestInit {
  auth?: boolean; // default true
  skipRedirectOn401?: boolean;
  _retryCount?: number; // internal use for refresh retry
}

// Token refresh function
async function refreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const refreshToken = localStorage.getItem('opsgraph_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Support both camelCase and snake_case expected by backend
      body: JSON.stringify({ refresh_token: refreshToken, refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, clear tokens
      localStorage.removeItem('opsgraph_token');
      localStorage.removeItem('opsgraph_refresh_token');
      return null;
    }

    const data = await response.json();
    // Accept both camelCase and snake_case
    const newAccess = data.accessToken || data.access_token;
    const newRefresh = data.refreshToken || data.refresh_token;
    if (newAccess && newRefresh) {
      localStorage.setItem('opsgraph_token', newAccess);
      localStorage.setItem('opsgraph_refresh_token', newRefresh);
      return newAccess;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return null;
}

export async function apiFetch<T = any>(input: string, init: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, skipRedirectOn401 = false, _retryCount = 0, headers, ...rest } = init;
  
  // Construct full URL if input is relative
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;
  
  // Debug logging
  console.log('[apiFetch] BASE:', API_BASE_URL, 'input:', input, 'url:', url);
  
  const finalHeaders: Record<string,string> = {
    Accept: 'application/json',
    ...(headers as any || {})
  };

  // Only set JSON content type if body is not FormData
  const bodyIsFormData = typeof FormData !== 'undefined' && (rest as any)?.body instanceof FormData;
  if (!bodyIsFormData) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  if (auth && typeof window !== 'undefined') {
    const token = localStorage.getItem('opsgraph_token');
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...rest, headers: finalHeaders });
  let body: any = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    if (res.status === 401 && !skipRedirectOn401 && typeof window !== 'undefined') {
      // Try to refresh token if this is the first retry
      if (_retryCount === 0 && auth) {
        const newToken = await refreshToken();
        if (newToken) {
          // Retry the request with the new token
          return apiFetch(input, { ...init, _retryCount: 1 });
        }
      }
      
      // Refresh failed or already retried, clear tokens & redirect
      localStorage.removeItem('opsgraph_token');
      localStorage.removeItem('opsgraph_refresh_token');
      Router.replace('/login');
    }
    const err: ApiError = Object.assign(new Error(body?.error || `Request failed: ${res.status}`), { status: res.status, body });
    
    // Store last error for debugging
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug_last_api_error', `${url} -> ${res.status}: ${err.message}`);
    }
    
    throw err;
  }
  return body as T;
}

// Variant that returns the Response (to read headers like ETag)
export async function apiFetchResponse<T = any>(input: string, init: ApiFetchOptions = {}): Promise<{ data: T; response: Response; etag?: string }> {
  const { auth = true, skipRedirectOn401 = false, _retryCount = 0, headers, ...rest } = init;
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;
  const finalHeaders: Record<string,string> = { Accept: 'application/json', ...(headers as any || {}) };
  const bodyIsFormData = typeof FormData !== 'undefined' && (rest as any)?.body instanceof FormData;
  if (!bodyIsFormData) finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  
  if (auth && typeof window !== 'undefined') {
    const token = localStorage.getItem('opsgraph_token');
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, { ...rest, headers: finalHeaders });
  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const text = await res.text();
    if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  } else if (contentType) {
    // For non-JSON (e.g., downloads), return a Blob
    body = await res.blob();
  } else {
    // No content-type header; try to read as blob to be safe
    try { body = await res.blob(); } catch {
      const text = await res.text();
      body = text;
    }
  }
  
  if (!res.ok) {
    if (res.status === 401 && !skipRedirectOn401 && typeof window !== 'undefined') {
      // Try to refresh token if this is the first retry
      if (_retryCount === 0 && auth) {
        const newToken = await refreshToken();
        if (newToken) {
          // Retry the request with the new token
          return apiFetchResponse(input, { ...init, _retryCount: 1 });
        }
      }
      
      // Refresh failed or already retried, clear tokens & redirect
      localStorage.removeItem('opsgraph_token');
      localStorage.removeItem('opsgraph_refresh_token');
      Router.replace('/login');
    }
    const err: ApiError = Object.assign(new Error(body?.error || `Request failed: ${res.status}`), { status: res.status, body });
    
    // Store last error for debugging
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug_last_api_error', `${url} -> ${res.status}: ${err.message}`);
    }
    
    throw err;
  }
  const etag = res.headers.get('etag') || undefined;
  return { data: body as T, response: res, etag };
}
