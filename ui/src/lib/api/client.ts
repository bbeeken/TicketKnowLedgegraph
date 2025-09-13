import Router from 'next/router';

// API base URL configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// Centralized API fetch helper
// - Automatically attaches Authorization header if token in localStorage (browser only)
// - Handles 401 by redirecting to /login
// - Parses JSON and throws enriched Error containing status & body
export interface ApiError extends Error {
  status: number;
  body?: any;
}

export interface ApiFetchOptions extends RequestInit {
  auth?: boolean; // default true
  skipRedirectOn401?: boolean;
}

export async function apiFetch<T = any>(input: string, init: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, skipRedirectOn401 = false, headers, ...rest } = init;
  
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
      // clear token & redirect
      localStorage.removeItem('opsgraph_token');
      Router.replace('/login');
    }
    const err: ApiError = Object.assign(new Error(body?.error || `Request failed: ${res.status}`), { status: res.status, body });
    throw err;
  }
  return body as T;
}
