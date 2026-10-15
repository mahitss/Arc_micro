'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string, orgName?: string) => Promise<{ api_key?: { secret: string; name: string } }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setOrganization(data.organization || null);
          return;
        }
      }
      setUser(null);
      setOrganization(null);
    } catch {
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data.error?.message || data.message || 'Login failed';
      throw new Error(message);
    }

    setUser(data.user);
    setOrganization(data.organization || null);
    router.push('/dashboard');
  };

  const signup = async (email: string, password: string, name?: string, orgName?: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password, name, org_name: orgName }),
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data.error?.message || data.message || 'Sign up failed';
      throw new Error(message);
    }

    setUser(data.user);
    setOrganization(data.organization || null);
    return { api_key: data.api_key };
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setOrganization(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
