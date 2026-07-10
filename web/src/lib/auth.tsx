'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, session, SessionUser } from './api';

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Roles that always pass client-side checks (server re-validates everything). */
const SUPER_ROLES = ['SUPER_ADMIN', 'OWNER'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(session.getUser());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: SessionUser }>('/auth/login', {
      email,
      password,
    });
    session.set(res.accessToken, res.refreshToken, res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: session.getRefresh() });
    } catch {
      /* best effort */
    }
    session.clear();
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      if (SUPER_ROLES.includes(user.role)) return true;
      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo(() => ({ user, isLoading, login, logout, hasRole }), [user, isLoading, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
