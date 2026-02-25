import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch, ApiError } from '../api/client';
import type { MeResponse } from '@asm-kyc/shared';

interface AuthState {
  user: MeResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    phone_e164: string;
    full_name: string;
    counterparty_type: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>('/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const handler = () => setUser(null);
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [fetchMe]);

  const login = async (username: string, password: string) => {
    const me = await apiFetch<MeResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser(me);
  };

  const register = async (data: {
    username: string;
    password: string;
    phone_e164: string;
    full_name: string;
    counterparty_type: string;
  }) => {
    const me = await apiFetch<MeResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUser(me);
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      if (!(e instanceof ApiError && e.statusCode === 401)) throw e;
    }
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>('/me');
      setUser(me);
    } catch {
      // silent fail
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
