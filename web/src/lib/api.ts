'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_KEY = 'aura.access';
const REFRESH_KEY = 'aura.refresh';
const USER_KEY = 'aura.user';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
}

export const session = {
  getAccess: () => (typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY)),
  getRefresh: () => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY)),
  getUser: (): SessionUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  set: (accessToken: string, refreshToken: string, user: SessionUser) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = session.getRefresh();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        session.set(data.accessToken, data.refreshToken, data.user);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshPromise = null), 0);
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = session.getAccess();
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/login')) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
    session.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    const message = Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message, body);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res.json() as Promise<T>;
  return res.blob() as unknown as Promise<T>;
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>(`${path}${qs(params)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
  /** Direct URL for report downloads etc. (adds auth via fetch → blob → object URL). */
  download: async (path: string, params?: Record<string, unknown>) => {
    const blob = await request<Blob>(`${path}${qs(params)}`);
    return URL.createObjectURL(blob);
  },
};

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
