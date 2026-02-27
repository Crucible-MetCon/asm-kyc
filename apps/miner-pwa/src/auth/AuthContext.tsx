import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch, ApiError, NetworkError } from '../api/client';
import { getAuthCache, setAuthCache, clearAuthCache, clearAllCaches } from '../offline/db';
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
      // Cache the successful response for offline use
      await setAuthCache(me);
    } catch (err) {
      if (err instanceof NetworkError) {
        // Offline — try to load from IndexedDB cache so user stays "logged in"
        const cached = await getAuthCache();
        if (cached) {
          setUser(cached);
        } else {
          setUser(null);
        }
      } else {
        // Real auth failure (401, etc.) — clear cache
        setUser(null);
        await clearAuthCache();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const handler = () => {
      setUser(null);
      clearAuthCache();
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [fetchMe]);

  const login = async (username: string, password: string) => {
    const me = await apiFetch<MeResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser(me);
    await setAuthCache(me);
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
    await setAuthCache(me);
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      if (!(e instanceof ApiError && e.statusCode === 401) && !(e instanceof NetworkError)) throw e;
    }
    setUser(null);
    // Clear all IndexedDB caches on logout
    await clearAllCaches();
  };

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>('/me');
      setUser(me);
      await setAuthCache(me);
    } catch {
      // silent fail — keep current cached user if offline
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
